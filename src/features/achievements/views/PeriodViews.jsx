import { CalendarDays, Heart, Sparkles } from 'lucide-react';
import { CategorySummary } from '../components/CategorySummary.jsx';
import { EntryCard } from '../components/EntryCard.jsx';
import { buildWeekViewModel } from '../viewModels/weekViewModel.js';
import { buildMonthViewModel } from '../viewModels/monthViewModel.js';
import { buildJourneyViewModel } from '../viewModels/journeyViewModel.js';
import { buildYearViewModel } from '../viewModels/yearViewModel.js';
import { categoryForKey } from '../../../utils/winClassifier.js';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

function ViewIntro({ title, description, children }) {
  return (
    <header className="period-view-intro">
      <div><h1>{title}</h1><p>{description}</p></div>
      {children}
    </header>
  );
}

export function TodayView({ entries, onOpen, newEntryId }) {
  const today = new Date();
  return (
    <section className="period-view today-journey">
      <ViewIntro title="今天，哪些事真的发生了？" description="不用完成一整天。你已经做到的这一小段，也算数。">
        <span className="period-date-label">{today.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</span>
      </ViewIntro>
      <div className="today-journey__line" />
      <div className="today-journey__entries">
        {entries.map((entry, index) => (
          <article className={`today-journey__entry ${index % 2 ? 'is-left' : 'is-right'}`} key={entry.id}>
            <time>{entry.occurredAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}</time>
            <i style={{ '--category-color': categoryForKey(entry.category).color }} />
            <EntryCard entry={entry} onOpen={onOpen} isNew={String(entry.id) === String(newEntryId)} />
          </article>
        ))}
      </div>
    </section>
  );
}

export function WeekView({ entries, onOpen, newEntryId }) {
  const model = buildWeekViewModel(entries);
  return (
    <section className="period-view week-journey">
      <ViewIntro title="这一周，你回来过这些时刻" description={model.summary}>
        <div className="period-facts"><span><strong>{model.activeDays}</strong> 个有记录的日子</span><span><strong>{model.totalEntries}</strong> 个做到</span></div>
      </ViewIntro>
      <CategorySummary counts={model.categoryCounts} />
      <div className="week-journey__rail">
        {model.days.map((day) => (
          <article className={`week-day${day.isToday ? ' is-today' : ''}${day.entries.length ? ' has-entry' : ''}`} key={day.key}>
            <header><span>{day.label}</span><strong>{day.dayNumber}</strong></header>
            <div className="week-day__stem" />
            {day.entries.length ? (
              <div className="week-day__entries">
                {day.entries.map((entry) => <EntryCard key={entry.id} entry={entry} onOpen={onOpen} compact isNew={String(entry.id) === String(newEntryId)} />)}
              </div>
            ) : <p>留白也没关系</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

export function MonthView({ entries, onOpen, newEntryId }) {
  const model = buildMonthViewModel(entries);
  return (
    <section className="period-view month-atlas">
      <ViewIntro title={`${model.label}的生活纹理`} description="日历不是打卡表，只是帮你看见：原来这个月已经发生了这些事。">
        <div className="period-facts"><span><strong>{model.activeDays}</strong> 天留下痕迹</span><span><strong>{model.totalEntries}</strong> 个做到</span></div>
      </ViewIntro>
      <div className="month-atlas__layout">
        <div className="month-calendar">
          <div className="month-calendar__weekdays">{WEEKDAY_LABELS.map((label) => <span key={label}>{label}</span>)}</div>
          <div className="month-calendar__grid">
            {model.cells.map((cell) => cell.empty ? <i className="is-empty" key={cell.key} /> : (
              <article className={`${cell.isToday ? 'is-today' : ''}${cell.entries.length ? ' has-entry' : ''}`} key={cell.key}>
                <time>{cell.dayNumber}</time>
                <div>{cell.entries.slice(0, 4).map((entry) => <button type="button" key={entry.id} onClick={() => onOpen(entry)} style={{ '--category-color': categoryForKey(entry.category).color }} aria-label={`打开：${entry.title}`} />)}</div>
                {cell.entries.length > 4 && <small>+{cell.entries.length - 4}</small>}
              </article>
            ))}
          </div>
        </div>
        <aside className="month-notes">
          <h2>这个月留下的颜色</h2>
          <CategorySummary counts={model.categoryCounts} />
          <h2>想再看一眼的瞬间</h2>
          <div>{model.representatives.map((entry) => <EntryCard key={entry.id} entry={entry} onOpen={onOpen} compact isNew={String(entry.id) === String(newEntryId)} />)}</div>
        </aside>
      </div>
    </section>
  );
}

export function JourneyView({ entries, onOpen, newEntryId }) {
  const model = buildJourneyViewModel(entries);
  return (
    <section className="period-view journey-chapters">
      <ViewIntro title="最近六个月，是一段有来路的旅程" description="这里不比较哪一个月更好，只把已经走过的章节按顺序放在一起。">
        <div className="period-facts"><span><strong>{model.activeMonths}</strong> 个月有记录</span><span><strong>{model.totalEntries}</strong> 个做到</span></div>
      </ViewIntro>
      <div className="journey-chapters__list">
        {model.months.map((month, index) => (
          <article className={`journey-chapter${month.totalEntries ? ' has-entry' : ''}`} key={month.key}>
            <span className="journey-chapter__index">{String(index + 1).padStart(2, '0')}</span>
            <header><small>{month.yearLabel}</small><h2>{month.label}</h2><p>{month.totalEntries ? `${month.activeDays} 天里，留下 ${month.totalEntries} 个做到` : '这一章暂时留白'}</p></header>
            <div className="journey-chapter__marks">{Object.entries(month.categoryCounts).map(([key, count]) => <span key={key} style={{ '--category-color': categoryForKey(key).color, '--mark-size': `${Math.min(100, 28 + count * 12)}%` }}><i />{categoryForKey(key).label}<b>{count}</b></span>)}</div>
            <div className="journey-chapter__memory">{month.representative ? <EntryCard entry={month.representative} onOpen={onOpen} compact isNew={String(month.representative.id) === String(newEntryId)} /> : <span>空白不是失败，只是还没有记录。</span>}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function YearView({ entries, onOpen }) {
  const model = buildYearViewModel(entries);
  return (
    <section className="period-view year-panorama">
      <ViewIntro title={`${model.year}：微小而确定的光芒`} description={`这一年，你留下了 ${model.totalEntries} 个真实发生的瞬间。每个圆点可以收藏一天里的不止一件事。`}>
        <CategorySummary counts={model.categoryCounts} />
      </ViewIntro>
      <div className="year-panorama__map" aria-label={`${model.year} 年成就分布`}>
        {model.days.map((day) => {
          const category = categoryForKey(day.leadingCategory);
          return day.count ? (
            <button key={day.key} type="button" onClick={() => onOpen(day.entries[day.entries.length - 1])} style={{ '--category-color': category.color, '--dot-scale': Math.min(1.65, 1 + (day.count - 1) * 0.18) }} aria-label={`${day.key}，${day.count} 个做到`} />
          ) : <i key={day.key} />;
        })}
      </div>
      <div className="year-panorama__months"><span>一月</span><span>三月</span><span>五月</span><span>七月</span><span>九月</span><span>十一月</span><span>十二月</span></div>
      <div className="year-panorama__insights">
        <article><header><CalendarDays /><h2>你回来过的日子</h2></header><strong>{model.activeDays}</strong><p>不要求连续。每一次回来，都算数。</p></article>
        <article className="is-accent"><header><Sparkles /><h2>被看见的努力</h2></header><strong>{model.totalEntries}</strong><p>它们没有因为微小而失去意义。</p></article>
        <article><header><Heart /><h2>被你珍藏的瞬间</h2></header><strong>{model.celebratedCount}</strong><p>这是你亲自选出来、想再看一眼的证据。</p></article>
      </div>
    </section>
  );
}

export function PeriodViewRouter({ period, entries, onOpen, newEntryId }) {
  if (period === 'today') return <TodayView entries={entries} onOpen={onOpen} newEntryId={newEntryId} />;
  if (period === 'week') return <WeekView entries={entries} onOpen={onOpen} newEntryId={newEntryId} />;
  if (period === 'month') return <MonthView entries={entries} onOpen={onOpen} newEntryId={newEntryId} />;
  if (period === 'journey') return <JourneyView entries={entries} onOpen={onOpen} newEntryId={newEntryId} />;
  return <YearView entries={entries} onOpen={onOpen} />;
}
