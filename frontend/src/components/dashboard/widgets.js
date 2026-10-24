import ProgressChartWidget from './ProgressChartWidget';
import RecentTestsWidget from './RecentTestsWidget';
import QuickStartWidget from './QuickStartWidget';
import PinnedTasks from './PinnedTasks';
import SubjectMasteryWidget from './SubjectMasteryWidget';
import ActivityHeatmap from './ActivityHeatmap';
import ReadinessWidget from './ReadinessWidget';
import FlashcardWidget from './FlashcardWidget';
import ActivityFeed from './ActivityFeed';
import DailyMotivationWidget from './DailyMotivationWidget';

export {
  ProgressChartWidget,
  RecentTestsWidget,
  QuickStartWidget,
  PinnedTasks,
  SubjectMasteryWidget,
  ActivityHeatmap,
  ReadinessWidget,
  FlashcardWidget,
  ActivityFeed,
  DailyMotivationWidget,
};

export const WIDGET_COMPONENT_MAP = {
  ProgressChart: ProgressChartWidget,
  RecentTests: RecentTestsWidget,
  QuickStart: QuickStartWidget,
  PinnedTasks: PinnedTasks,
  SubjectMastery: SubjectMasteryWidget,
  RecentActivity: ActivityHeatmap,
  ReadinessWidget: ReadinessWidget,
  FlashcardWidget: FlashcardWidget,
  ActivityFeed: ActivityFeed,
  DailyMotivation: DailyMotivationWidget,
};
