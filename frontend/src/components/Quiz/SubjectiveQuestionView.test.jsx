import { fireEvent, render, screen } from '@testing-library/react';
import SubjectiveQuestionView from './SubjectiveQuestionView';

describe('SubjectiveQuestionView', () => {
  it('invalidates a prior evaluation when the written answer changes', () => {
    const onAnswerChange = vi.fn();
    render(
      <SubjectiveQuestionView
        question={{ _id: 'question-1', questionText: 'Explain the topic.', maxScore: 10 }}
        existingAnswer="An evaluated answer"
        existingEvaluation={{ score: 7, maxScore: 10, feedback: 'Good explanation.' }}
        onAnswerChange={onAnswerChange}
      />
    );

    expect(screen.getByRole('status').textContent).toContain('Answer evaluation complete.');
    fireEvent.change(screen.getByLabelText(/Your Written Response/i), {
      target: { value: 'A revised answer' },
    });

    expect(onAnswerChange).toHaveBeenCalledWith('question-1', 'A revised answer');
    expect(screen.getByRole('status').textContent).not.toContain('Answer evaluation complete.');
  });
});
