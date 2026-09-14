/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { ScoreCard } from './ScoreCard';
import { Users } from 'lucide-react';

describe('ScoreCard', () => {
  it('renders the title and score correctly', () => {
    render(<ScoreCard title="Final Score" score={95} icon={<Users />} />);
    
    expect(screen.getByText('Final Score')).toBeInTheDocument();
    expect(screen.getByText('95')).toBeInTheDocument();
  });

  it('renders subtitle if provided', () => {
    render(<ScoreCard title="Completion" score={80} subtitle="80 out of 100" icon={<Users />} />);
    
    expect(screen.getByText('80 out of 100')).toBeInTheDocument();
  });
});
