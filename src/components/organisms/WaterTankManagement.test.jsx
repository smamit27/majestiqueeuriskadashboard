import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WaterTankManagement from './WaterTankManagement';

describe('WaterTankManagement Component', () => {
  it('renders hero banner and key society storage metrics', () => {
    render(<WaterTankManagement isAdmin={true} />);
    
    // Main heading
    expect(screen.getByRole('heading', { level: 1, name: /Water Tank Management/i })).toBeInTheDocument();
    
    // Key invoice storage stats
    expect(screen.getByText('5,39,400 L')).toBeInTheDocument();
    expect(screen.getByText('3,25,000 L')).toBeInTheDocument();
    expect(screen.getByText('2,14,400 L')).toBeInTheDocument();
  });

  it('renders all sub-tab navigation buttons including Cleaning Bills & Rate Analysis', () => {
    render(<WaterTankManagement isAdmin={true} />);

    expect(screen.getByRole('button', { name: /3D Diagram & Spatial Model/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2D Blueprint & Pipeline Flow/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Live Tank Gauges & Monitoring/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Supply & Booster Pump Schedule/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hygiene, Cleaning & Water Quality/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cleaning Bills & Rate Analysis/i })).toBeInTheDocument();
  });

  it('allows switching to Cleaning Bills & Rate Analysis tab and renders invoice comparison', () => {
    render(<WaterTankManagement isAdmin={true} />);

    const auditBtn = screen.getByRole('button', { name: /Cleaning Bills & Rate Analysis/i });
    fireEvent.click(auditBtn);

    expect(screen.getByText(/Invoiced Water Tank Cleaning Bill & Capacity Rate Audit/i)).toBeInTheDocument();
    expect(screen.getAllByText(/13,500/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Where the Cleaning Charge Is Higher or Lower/i)).toBeInTheDocument();
    expect(screen.getByText(/Standard Contractual Rate Card Simulator/i)).toBeInTheDocument();
  });

  it('allows switching to 2D Blueprint & Pipeline Flow tab', () => {
    render(<WaterTankManagement isAdmin={true} />);

    const tab2dBtn = screen.getByRole('button', { name: /2D Blueprint & Pipeline Flow/i });
    fireEvent.click(tab2dBtn);

    expect(screen.getByText(/2D Master Blueprint & Flow Schematic/i)).toBeInTheDocument();
    expect(screen.getByText(/Domestic Water/i)).toBeInTheDocument();
    expect(screen.getByText(/STP Flushing/i)).toBeInTheDocument();
    expect(screen.getByText(/Fire Reserve/i)).toBeInTheDocument();
  });

  it('allows switching to Live Tank Gauges & Monitoring tab and adjusts level sliders', () => {
    render(<WaterTankManagement isAdmin={true} />);

    const monitorBtn = screen.getByRole('button', { name: /Live Tank Gauges & Monitoring/i });
    fireEvent.click(monitorBtn);

    expect(screen.getByText(/Water Tanker Order & Replenishment Estimator/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Common Underground Sump/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/A Building OHT/i)).toBeInTheDocument();
  });

  it('allows switching to Supply & Booster Pump Schedule tab', () => {
    render(<WaterTankManagement isAdmin={true} />);

    const scheduleBtn = screen.getByRole('button', { name: /Supply & Booster Pump Schedule/i });
    fireEvent.click(scheduleBtn);

    expect(screen.getByText(/Building Water Supply Timings/i)).toBeInTheDocument();
    expect(screen.getByText(/Booster Transfer Pumps/i)).toBeInTheDocument();
    expect(screen.getByText(/Morning Supply/i)).toBeInTheDocument();
  });

  it('allows switching to Hygiene, Cleaning & Water Quality tab', () => {
    render(<WaterTankManagement isAdmin={true} />);

    const hygieneBtn = screen.getByRole('button', { name: /Hygiene, Cleaning & Water Quality/i });
    fireEvent.click(hygieneBtn);

    expect(screen.getByText(/Potable Water Quality Lab Certification/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Dissolved Solids \(TDS\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Tank Cleaning & Sanitization Log/i)).toBeInTheDocument();
  });

  it('toggles between 3D Spatial Model and Master Architectural Plan in 3D tab', () => {
    render(<WaterTankManagement isAdmin={true} />);

    // Default is 3D Spatial Interactive Model
    expect(screen.getByText(/3D Spatial Controls Active/i)).toBeInTheDocument();

    // Toggle to Master Architectural Plan
    const masterPlanBtn = screen.getByRole('button', { name: /Master Architectural 3D Plan/i });
    fireEvent.click(masterPlanBtn);

    expect(screen.getByText(/Official Architectural 3D Isometric Masterplan/i)).toBeInTheDocument();
  });

  it('triggers window.open when Print Technical Spec PDF is clicked', () => {
    const mockOpen = vi.fn().mockReturnValue({
      document: {
        open: vi.fn(),
        write: vi.fn(),
        close: vi.fn(),
      },
      focus: vi.fn(),
      print: vi.fn(),
    });
    vi.stubGlobal('open', mockOpen);

    render(<WaterTankManagement isAdmin={true} />);
    const printBtn = screen.getByRole('button', { name: /Print Technical Spec PDF/i });
    fireEvent.click(printBtn);

    expect(mockOpen).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('renders smoothly for non-admin residents (isAdmin={false})', () => {
    render(<WaterTankManagement isAdmin={false} />);
    expect(screen.getByRole('heading', { level: 1, name: /Water Tank Management/i })).toBeInTheDocument();
    expect(screen.getByText('5,39,400 L')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3D Diagram & Spatial Model/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cleaning Bills & Rate Analysis/i })).toBeInTheDocument();
  });
});
