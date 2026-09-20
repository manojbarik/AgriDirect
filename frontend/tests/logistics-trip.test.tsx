import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import TripDetailPage from '../src/pages/logistics/TripDetailPage'
import type { TripDetail } from '../src/api/logistics'
import { createMock } from './test-utils'

function makeTrip(overrides: Partial<TripDetail> = {}): TripDetail {
  return {
    id: 's1',
    order_id: 'o1',
    order_number: 'ORD-1001',
    status: 'ASSIGNED',
    origin_label: 'Nashik farm',
    destination_label: 'Pune market',
    driver_name: 'Driver Rao',
    vehicle_label: 'MH-12-TR-9090',
    current_stop_index: 0,
    total_stops: 4,
    eta_minutes: null,
    started_at: null,
    delivered_at: null,
    updated_at: '2026-09-08T06:00:00Z',
    current_location_label: 'Nashik farm',
    next_stop_label: 'NH-16 highway plaza',
    progress_percent: 25,
    events: [
      {
        id: 'e1',
        sequence: 0,
        event_type: 'ASSIGNED',
        label: 'Trip assigned at Nashik farm',
        description: 'Delivery partner will transport ORD-1001.',
        latitude: 19.998,
        longitude: 73.789,
        occurred_at: '2026-09-08T06:00:00Z',
      },
    ],
    ...overrides,
  }
}

function renderTrip() {
  return render(
    <MemoryRouter initialEntries={['/logistics/trips/s1']}>
      <Routes>
        <Route path="/logistics/trips/:shipmentId" element={<TripDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TripDetailPage', () => {
  it('shows assignment state and starts the trip', async () => {
    const user = userEvent.setup()
    const mock = createMock()
    let trip = makeTrip()
    mock.onGet('/logistics/shipments/s1').reply(() => [200, trip])
    mock.onPost('/logistics/shipments/s1/start').reply(() => {
      trip = makeTrip({
        status: 'IN_TRANSIT',
        current_stop_index: 0,
        eta_minutes: 96,
        started_at: '2026-09-08T06:05:00Z',
        next_stop_label: 'NH-16 highway plaza',
        progress_percent: 25,
        events: [
          ...trip.events,
          {
            id: 'e2',
            sequence: 1,
            event_type: 'PICKUP',
            label: 'Cargo picked up at Nashik farm',
            description: 'Goods loaded and trip started.',
            latitude: 19.998,
            longitude: 73.789,
            occurred_at: '2026-09-08T06:05:00Z',
          },
          {
            id: 'e3',
            sequence: 2,
            event_type: 'ETA_UPDATE',
            label: 'ETA updated',
            description: 'Estimated time of arrival is now ~96 minutes.',
            latitude: null,
            longitude: null,
            occurred_at: '2026-09-08T06:05:01Z',
          },
        ],
      })
      return [200, trip]
    })

    renderTrip()

    expect((await screen.findAllByText(/ORD-1001/)).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Start trip/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Start trip/ }))
    await waitFor(() => {
      expect(screen.getByText('In Transit')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Advance \(simulate GPS\)/ })).toBeInTheDocument()
    })
    expect(screen.getByText(/estimated time of arrival is now ~96 minutes/i)).toBeInTheDocument()
    mock.restore()
  })

  it('advances along the route and lets the driver mark delivered at the last stop', async () => {
    const user = userEvent.setup()
    const mock = createMock()
    let trip = makeTrip({
      status: 'IN_TRANSIT',
      current_stop_index: 2,
      eta_minutes: 30,
      current_location_label: 'Collectorate junction',
      next_stop_label: 'Pune market',
      progress_percent: 75,
    })
    mock.onGet('/logistics/shipments/s1').reply(() => [200, trip])
    mock.onPost('/logistics/shipments/s1/advance').reply(() => {
      trip = makeTrip({
        status: 'IN_TRANSIT',
        current_stop_index: 3,
        eta_minutes: 12,
        current_location_label: 'Pune market',
        next_stop_label: null,
        progress_percent: 100,
        started_at: '2026-09-08T06:05:00Z',
      })
      return [200, trip]
    })
    mock.onPost('/logistics/shipments/s1/deliver').reply(() => {
      trip = makeTrip({
        status: 'DELIVERED',
        current_stop_index: 3,
        eta_minutes: 0,
        current_location_label: 'Pune market',
        next_stop_label: null,
        progress_percent: 100,
        started_at: '2026-09-08T06:05:00Z',
        delivered_at: '2026-09-08T07:00:00Z',
      })
      return [200, trip]
    })

    renderTrip()

    expect(await screen.findByText('Stop 3 of 4')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Advance \(simulate GPS\)/ }))
    await waitFor(() => {
      expect(screen.getByText('Stop 4 of 4')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /Mark delivered/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Mark delivered/ }))
    await waitFor(() => {
      expect(screen.getByText(/Delivered at Pune market/)).toBeInTheDocument()
    })
    expect(screen.getAllByText('Delivered').length).toBeGreaterThan(0)
    mock.restore()
  })

  it('shows a not-found message when the shipment does not exist', async () => {
    const mock = createMock()
    mock.onGet('/logistics/shipments/s1').reply(404)
    renderTrip()
    expect(await screen.findByText('Shipment not found.')).toBeInTheDocument()
    mock.restore()
  })
})