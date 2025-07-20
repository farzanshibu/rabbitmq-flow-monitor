import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeadLetterQueueManager } from '@/components/management/DeadLetterQueueManager';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock fetch
global.fetch = vi.fn();

const mockDeadLetterQueues = [
  {
    name: 'failed-orders-dlq',
    durable: true,
    autoDelete: false,
    arguments: {
      'x-dead-letter-exchange': 'dlx',
      'x-message-ttl': 30000
    },
    messageCount: 15,
    consumerCount: 0,
    messageRate: 0.5,
    originalQueue: 'orders-processing',
    deadLetterExchange: 'dlx'
  },
  {
    name: 'failed-notifications-dlq',
    durable: true,
    autoDelete: false,
    arguments: {
      'x-dead-letter-exchange': 'notifications-dlx'
    },
    messageCount: 3,
    consumerCount: 1,
    messageRate: 0.1,
    originalQueue: 'notifications',
    deadLetterExchange: 'notifications-dlx'
  }
];

const mockDeadLetterMessages = [
  {
    id: 'msg-001',
    payload: '{"orderId": "12345", "status": "failed"}',
    properties: {
      messageId: 'msg-001',
      timestamp: '2024-01-15T10:30:00Z',
      headers: {
        'x-death': [{
          reason: 'rejected',
          time: '2024-01-15T10:30:00Z',
          exchange: 'orders-exchange',
          'routing-keys': ['order.processing']
        }]
      }
    },
    routingKey: 'order.processing',
    exchange: 'orders-exchange',
    originalQueue: 'orders-processing',
    deadLetterReason: 'rejected',
    deadLetterTime: '2024-01-15T10:30:00Z',
    redeliveryCount: 3,
    originalExchange: 'orders-exchange',
    originalRoutingKey: 'order.processing'
  },
  {
    id: 'msg-002',
    payload: '{"orderId": "67890", "status": "expired"}',
    properties: {
      messageId: 'msg-002',
      timestamp: '2024-01-15T11:00:00Z',
      headers: {
        'x-death': [{
          reason: 'expired',
          time: '2024-01-15T11:00:00Z'
        }]
      }
    },
    routingKey: 'order.processing',
    exchange: 'orders-exchange',
    originalQueue: 'orders-processing',
    deadLetterReason: 'expired',
    deadLetterTime: '2024-01-15T11:00:00Z',
    redeliveryCount: 0
  }
];

describe('DeadLetterQueueManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default fetch mock responses
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/dead-letter-queues')) {
        if (url.includes('/messages')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: mockDeadLetterMessages
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockDeadLetterQueues
          })
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ success: false, error: 'Not found' })
      });
    });
  });

  it('renders dead letter queue management interface', async () => {
    render(<DeadLetterQueueManager />);
    
    // Check for main headings
    expect(screen.getByText('Dead Letter Queues')).toBeInTheDocument();
    expect(screen.getByText('Manage dead letter queue configuration and monitor failed messages')).toBeInTheDocument();
    
    // Check for tabs
    expect(screen.getByText('DLQ Management')).toBeInTheDocument();
    expect(screen.getByText('Message Inspection')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('loads and displays dead letter queues', async () => {
    render(<DeadLetterQueueManager />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('failed-orders-dlq')).toBeInTheDocument();
      expect(screen.getByText('failed-notifications-dlq')).toBeInTheDocument();
    });
    
    // Check queue details
    expect(screen.getByText('15 failed')).toBeInTheDocument();
    expect(screen.getByText('3 failed')).toBeInTheDocument();
    expect(screen.getByText('orders-processing')).toBeInTheDocument();
    expect(screen.getByText('notifications')).toBeInTheDocument();
  });

  it('allows configuring dead letter queue settings', async () => {
    render(<DeadLetterQueueManager />);
    
    // Click configure DLQ button
    const configButton = screen.getByText('Configure DLQ');
    fireEvent.click(configButton);
    
    // Check if dialog opens
    await waitFor(() => {
      expect(screen.getByText('Configure Dead Letter Queue')).toBeInTheDocument();
    });
    
    // Fill in form
    const queueNameInput = screen.getByLabelText('Queue Name');
    const dlxInput = screen.getByLabelText('Dead Letter Exchange');
    
    fireEvent.change(queueNameInput, { target: { value: 'test-queue' } });
    fireEvent.change(dlxInput, { target: { value: 'test-dlx' } });
    
    // Mock successful configuration
    (global.fetch as any).mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    );
    
    // Submit form
    const configureButton = screen.getByText('Configure');
    fireEvent.click(configureButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8081/api/dead-letter-queues/configure',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('test-queue')
        })
      );
    });
  });

  it('displays dead letter messages when queue is selected', async () => {
    render(<DeadLetterQueueManager />);
    
    // Wait for queues to load
    await waitFor(() => {
      expect(screen.getByText('failed-orders-dlq')).toBeInTheDocument();
    });
    
    // Click inspect button
    const inspectButton = screen.getAllByText('Inspect')[0];
    fireEvent.click(inspectButton);
    
    // Should switch to messages tab and show messages
    await waitFor(() => {
      expect(screen.getByText('msg-001')).toBeInTheDocument();
      expect(screen.getByText('rejected')).toBeInTheDocument();
      expect(screen.getByText('expired')).toBeInTheDocument();
    });
    
    // Check message details
    expect(screen.getByText('From: orders-processing')).toBeInTheDocument();
    expect(screen.getByText('Routing: order.processing')).toBeInTheDocument();
  });

  it('allows filtering messages by reason', async () => {
    render(<DeadLetterQueueManager />);
    
    // Load a queue first
    await waitFor(() => {
      expect(screen.getByText('failed-orders-dlq')).toBeInTheDocument();
    });
    
    const inspectButton = screen.getAllByText('Inspect')[0];
    fireEvent.click(inspectButton);
    
    await waitFor(() => {
      expect(screen.getByText('rejected')).toBeInTheDocument();
      expect(screen.getByText('expired')).toBeInTheDocument();
    });
    
    // Filter by rejected messages only
    const filterSelect = screen.getByDisplayValue('All Reasons');
    fireEvent.change(filterSelect, { target: { value: 'rejected' } });
    
    // Should only show rejected messages
    await waitFor(() => {
      expect(screen.getByText('rejected')).toBeInTheDocument();
      expect(screen.queryByText('expired')).not.toBeInTheDocument();
    });
  });

  it('supports message replay functionality', async () => {
    render(<DeadLetterQueueManager />);
    
    // Load messages
    await waitFor(() => {
      expect(screen.getByText('failed-orders-dlq')).toBeInTheDocument();
    });
    
    const inspectButton = screen.getAllByText('Inspect')[0];
    fireEvent.click(inspectButton);
    
    await waitFor(() => {
      expect(screen.getByText('rejected')).toBeInTheDocument();
    });
    
    // Select a message
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // Skip the "select all" checkbox
    
    // Click replay button
    const replayButton = screen.getByText(/Replay \(1\)/);
    fireEvent.click(replayButton);
    
    // Should open replay dialog
    await waitFor(() => {
      expect(screen.getByText('Replay Dead Letter Messages')).toBeInTheDocument();
    });
    
    // Fill in replay configuration
    const targetExchangeInput = screen.getByLabelText('Target Exchange');
    fireEvent.change(targetExchangeInput, { target: { value: 'orders-retry-exchange' } });
    
    // Mock successful replay
    (global.fetch as any).mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    );
    
    // Submit replay
    const replaySubmitButton = screen.getByText('Replay Messages');
    fireEvent.click(replaySubmitButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8081/api/dead-letter-queues/replay',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('orders-retry-exchange')
        })
      );
    });
  });

  it('handles message export functionality', async () => {
    render(<DeadLetterQueueManager />);
    
    // Load messages and select one
    await waitFor(() => {
      expect(screen.getByText('failed-orders-dlq')).toBeInTheDocument();
    });
    
    const inspectButton = screen.getAllByText('Inspect')[0];
    fireEvent.click(inspectButton);
    
    await waitFor(() => {
      expect(screen.getByText('rejected')).toBeInTheDocument();
    });
    
    // Select a message
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    
    // Mock successful export
    (global.fetch as any).mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(['{}'], { type: 'application/json' }))
      })
    );
    
    // Click export button
    const exportButton = screen.getByText(/Export \(1\)/);
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8081/api/dead-letter-queues/export',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  it('shows analytics with proper dead letter metrics', async () => {
    render(<DeadLetterQueueManager />);
    
    // Switch to analytics tab
    const analyticsTab = screen.getByText('Analytics');
    fireEvent.click(analyticsTab);
    
    await waitFor(() => {
      expect(screen.getByText('Dead Letter Analytics')).toBeInTheDocument();
    });
    
    // Check analytics metrics
    expect(screen.getByText('Total DLQs')).toBeInTheDocument();
    expect(screen.getByText('Failed Messages')).toBeInTheDocument();
    expect(screen.getByText('Failure Rate')).toBeInTheDocument();
    expect(screen.getByText('Active DLQ Consumers')).toBeInTheDocument();
  });

  it('handles error states gracefully', async () => {
    // Mock fetch error
    (global.fetch as any).mockImplementationOnce(() => 
      Promise.reject(new Error('Network error'))
    );
    
    render(<DeadLetterQueueManager />);
    
    // Should show error state
    await waitFor(() => {
      expect(screen.getByText(/Error loading dead letter queues/)).toBeInTheDocument();
    });
  });

  it('validates form inputs properly', async () => {
    render(<DeadLetterQueueManager />);
    
    // Open configuration dialog
    const configButton = screen.getByText('Configure DLQ');
    fireEvent.click(configButton);
    
    await waitFor(() => {
      expect(screen.getByText('Configure Dead Letter Queue')).toBeInTheDocument();
    });
    
    // Try to submit without required fields
    const configureButton = screen.getByText('Configure');
    expect(configureButton).toBeDisabled();
    
    // Fill only queue name
    const queueNameInput = screen.getByLabelText('Queue Name');
    fireEvent.change(queueNameInput, { target: { value: 'test-queue' } });
    
    // Should still be disabled without DLX
    expect(configureButton).toBeDisabled();
    
    // Fill DLX
    const dlxInput = screen.getByLabelText('Dead Letter Exchange');
    fireEvent.change(dlxInput, { target: { value: 'test-dlx' } });
    
    // Should now be enabled
    expect(configureButton).not.toBeDisabled();
  });
});
