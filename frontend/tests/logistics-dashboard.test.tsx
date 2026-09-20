import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import LogisticsDashboardPage from '../src/pages/logistics/LogisticsDashboardPage'
import { I18nProvider } from '../src/i18n/I18nProvider'
import { createMock } from './test-utils'

vi.mock('../src/contexts/useAuth', () => ({
  useAuth: () => ({ user: { role: 'LOGISTICS' }, initializing: false }),
}))

describe('LogisticsDashboardPage', () => {
  it('lists live shipments and assigns an awaiting order to a trip', async () => {
    const user = userEvent.setup()
    const mock = createMock()
    let shipments = [
      {
        id: 's1',
        order_id: 'o1',
        order_number: 'ORD-1001',
        status: 'ASSIGNED',
        origin_label: 'Nashik farm',
        destination_label: 'Pune market',
        driver_name: null,
        vehicle_label: null,
        current_stop_index: 0,
        total_stops: 4,
        eta_minutes: null,
        started_at: null,
        delivered_at: null,
        updated_at: '2026-09-08T06:00:00Z',
      },
    ]
    let awaiting = [
      {
        id: 'o2',
        order_number: 'ORD-1002',
        status: 'READY_FOR_PICKUP',
        farmer_name: 'Test Farmer',
        buyer_name: 'Test Buyer',
        origin_label: 'Nashik farm',
        destination_label: 'Pune market',
        total_amount: '2500.00',
      },
    ]
    mock.onGet('/logistics/shipments').reply(() => [200, shipments])
    mock.onGet('/logistics/orders/awaiting').reply(() => [200, awaiting])
    mock.onPost('/logistics/shipments').reply((config) => {
      const body = JSON.parse(config.data)
      shipments = [
        ...shipments,
        {
          id: 's2',
          order_id: body.order_id,
          order_number: 'ORD-1002',
          status: 'ASSIGNED',
          origin_label: 'Nashik farm',
          destination_label: 'Pune market',
          driver_name: body.driver_name ?? null,
          vehicle_label: body.vehicle_label ?? null,
          current_stop_index: 0,
          total_stops: 4,
          eta_minutes: null,
          started_at: null,
          delivered_at: null,
          updated_at: '2026-09-08T06:00:00Z',
        },
      ]
      awaiting = []
      return [201, shipments[shipments.length - 1]]
    })

    render(
      <MemoryRouter>
        <I18nProvider>
          <LogisticsDashboardPage />
        </I18nProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText(/ORD-1001/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Dispatch Queue' }))
    expect(await screen.findByText('#ORD-1002')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Assign Fleet Driver' }))
    const driverInput = screen.getByPlaceholderText('Driver full name...')
    await user.type(driverInput, 'Driver Rao')
    await user.click(screen.getByRole('button', { name: /Confirm & Start Trip/ }))

    await waitFor(() => {
      expect(screen.getByText(/All orders have been assigned/)).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Live Map' }))
    expect(await screen.findByText('#ORD-1002')).toBeInTheDocument()
    expect(screen.getByText('🚚 Driver Rao')).toBeInTheDocument()
    mock.restore()
  })
})