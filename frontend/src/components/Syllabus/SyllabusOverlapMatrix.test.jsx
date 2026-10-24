import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import SyllabusOverlapMatrix from './SyllabusOverlapMatrix';
import { getSyllabusCatalog, compareSyllabi } from '../../services/api';

vi.mock('../../services/api', () => ({
  getSyllabusCatalog: vi.fn(),
  compareSyllabi: vi.fn(),
}));

const result = {
  syllabi: [
    { id: 'a', name: 'JEE Main', weightedCoverage: 66.7 },
    { id: 'b', name: 'BITSAT', weightedCoverage: 54.5 },
  ],
  overlapPercentage: 50,
  shared: [{}, {}],
  exclusive: [{}, {}],
  studyHours: { saved: 12 },
  topics: [
    {
      key: 't1',
      title: 'Laws of Motion',
      moduleName: 'Physics',
      type: 'shared',
      presentIn: ['a', 'b'],
      estimatedHours: 6,
      entries: [{ title: 'Laws of Motion' }],
    },
    {
      key: 't2',
      title: 'Organic Chemistry',
      moduleName: 'Chemistry',
      type: 'exclusive',
      presentIn: ['a'],
      estimatedHours: 5,
      entries: [{ title: 'Organic Chemistry' }],
    },
    {
      key: 't3',
      title: 'English Proficiency',
      moduleName: '',
      type: 'exclusive',
      presentIn: ['b'],
      estimatedHours: 7,
      entries: [{ title: 'English Proficiency' }],
    },
  ],
};

const setup = async () => {
  getSyllabusCatalog.mockResolvedValue({
    data: {
      data: [
        { id: 'a', name: 'JEE Main' },
        { id: 'b', name: 'BITSAT' },
      ],
    },
  });
  compareSyllabi.mockResolvedValue({ data: { data: result } });
  render(<SyllabusOverlapMatrix />);
  fireEvent.click(await screen.findByLabelText('JEE Main'));
  fireEvent.click(screen.getByLabelText('BITSAT'));
  fireEvent.click(screen.getByRole('button', { name: 'Compare' }));
  await screen.findByText('Laws of Motion');
};

describe('SyllabusOverlapMatrix', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps Compare disabled until two syllabi are picked', async () => {
    getSyllabusCatalog.mockResolvedValue({
      data: {
        data: [
          { id: 'a', name: 'JEE Main' },
          { id: 'b', name: 'BITSAT' },
        ],
      },
    });
    render(<SyllabusOverlapMatrix />);
    const btn = await screen.findByRole('button', { name: 'Compare' });
    expect(btn).toBeDisabled();
    fireEvent.click(screen.getByLabelText('JEE Main'));
    expect(btn).toBeDisabled();
    fireEvent.click(screen.getByLabelText('BITSAT'));
    expect(btn).toBeEnabled();
  });

  it('shows all rows and the summary after comparing', async () => {
    await setup();
    expect(compareSyllabi).toHaveBeenCalledWith(['a', 'b']);
    expect(screen.getAllByTestId('overlap-row')).toHaveLength(3);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('Shared Only and Exam-Exclusive Only chips filter the rows', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Shared Only' }));
    expect(screen.getAllByTestId('overlap-row')).toHaveLength(1);
    expect(screen.getByText('Laws of Motion')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Exam-Exclusive Only' }));
    expect(screen.getAllByTestId('overlap-row')).toHaveLength(2);
    expect(screen.queryByText('Laws of Motion')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show All' }));
    expect(screen.getAllByTestId('overlap-row')).toHaveLength(3);
  });

  it('search narrows the rows and shows an empty state', async () => {
    await setup();
    fireEvent.change(screen.getByLabelText('Search topics'), { target: { value: 'chem' } });
    expect(screen.getAllByTestId('overlap-row')).toHaveLength(1);
    expect(screen.getByText('Organic Chemistry')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search topics'), { target: { value: 'zzz' } });
    expect(screen.getByText('No topics match.')).toBeInTheDocument();
  });

  it('shows the server error message when compare fails', async () => {
    getSyllabusCatalog.mockResolvedValue({
      data: {
        data: [
          { id: 'a', name: 'JEE Main' },
          { id: 'b', name: 'BITSAT' },
        ],
      },
    });
    compareSyllabi.mockRejectedValue({
      response: { data: { error: 'One or more syllabi were not found.' } },
    });
    render(<SyllabusOverlapMatrix />);
    fireEvent.click(await screen.findByLabelText('JEE Main'));
    fireEvent.click(screen.getByLabelText('BITSAT'));
    fireEvent.click(screen.getByRole('button', { name: 'Compare' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('One or more syllabi were not found.')
    );
  });
});
