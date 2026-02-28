import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveData } from '../hooks/useLiveData.js';
import LeaderboardTable from '../components/leaderboard/LeaderboardTable.jsx';
import LeaderboardViewFilter from '../components/filters/LeaderboardViewFilter.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import ErrorBanner from '../components/ui/ErrorBanner.jsx';
import { formatRelativeTime } from '../utils/formatDate.js';
import './Home.css';

const VIEW_TITLES = {
  live:  'Current Concurrent Players',
  today: 'Peak CCU Today',
  '7d':  'Average Peak CCU — Last 7 Days',
  '30d': 'Average Peak CCU — Last 30 Days',
  '90d': 'Average Peak CCU — Last 90 Days',
  '180d':'Average Peak CCU — Last 180 Days',
  '365d':'Average Peak CCU — Last Year',
};

const AVG_VIEWS = new Set(['7d', '30d', '90d', '180d', '365d']);

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') ?? 'live';

  const { data, meta, loading, error, lastUpdated } = useLiveData(view);

  const handleViewChange = (newView) => {
    setSearchParams({ view: newView });
  };

  const isAvgView = AVG_VIEWS.has(view);
  const periodDays = meta?.period_days ?? parseInt(view, 10);
  const dataDays = meta?.data_days ?? 0;
  const dataComplete = dataDays >= periodDays;

  return (
    <div className="home-page">
      <div className="home-header">
        <div>
          <h1 className="home-title">Top 100 Steam Games</h1>
          <p className="home-subtitle">{VIEW_TITLES[view] ?? 'Steam leaderboard'}</p>
        </div>
        {view === 'live' && lastUpdated && (
          <div className="home-updated">
            Updated {formatRelativeTime(lastUpdated)}
          </div>
        )}
      </div>

      <LeaderboardViewFilter value={view} onChange={handleViewChange} />

      {loading && <Spinner size="lg" />}
      {error && <ErrorBanner message={error} />}
      {data && (
        <>
          {isAvgView && !dataComplete && (
            <div className="home-data-notice">
              <strong>Building history:</strong> ranked by avg peak CCU across{' '}
              {dataDays} of {periodDays} days collected so far. Rankings are
              independently computed for each time window — as data accumulates,
              titles and order will diverge from the Live and Today views based
              on each game&apos;s actual historical average.
            </div>
          )}
          {isAvgView && dataComplete && (
            <p className="home-ccu-notice">
              Ranked by average peak CCU over {periodDays} days. Games with higher
              historical averages may differ from the Live view.
            </p>
          )}
          {!isAvgView && (
            <p className="home-ccu-notice">CCU counts are updated every 60 minutes.</p>
          )}
          <LeaderboardTable games={data} view={view} />
        </>
      )}
    </div>
  );
}
