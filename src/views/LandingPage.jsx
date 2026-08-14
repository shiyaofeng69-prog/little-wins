import { ArrowRight, Github, Heart, Layers3, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const SOURCE_URL = 'https://github.com/shiyaofeng69-prog/little-wins';

const principles = [
  { icon: Sparkles, title: '只写下来就好', description: '不必先选择心情或分类。写下一句话，剩下的整理交给系统。' },
  { icon: Heart, title: '温柔，不催促', description: '没有断签、归零和落后提醒。休息、开始和尝试本身都值得被看见。' },
  { icon: Layers3, title: '把努力收藏起来', description: '在今日时间线、周月收藏板和年度回顾中，重新看见自己的生活轨迹。' },
];

function Brand() {
  return <Link className="landing__brand" to="/"><span><Sparkles size={17} /></span><strong>小小做到</strong><i>/</i><b>LITTLE WINS</b></Link>;
}

function PrincipleCard({ item }) {
  const PrincipleIcon = item.icon;
  return <article><PrincipleIcon /><h3>{item.title}</h3><p>{item.description}</p></article>;
}

const LandingPage = () => (
  <div className="landing">
    <header className="landing__nav">
      <Brand />
      <nav><a href="#principles">产品理念</a><Link to="/about">关于</Link><a href={SOURCE_URL} target="_blank" rel="noreferrer">源码</a></nav>
      <Link className="landing__nav-cta" to="/start">先记一件 <ArrowRight size={15} /></Link>
    </header>

    <main>
      <section className="landing__hero">
        <div className="landing__hero-copy">
          <span className="landing__eyebrow">A GENTLE RECORD OF WHAT YOU DID</span>
          <h1>每一个做到，<br />都值得被看见。</h1>
          <p>这里不催你完成更多，只帮你记住已经发生的努力。起床、喝水、回复消息，哪怕很小，也算数。</p>
          <div className="landing__actions"><Link to="/start">记下第一个小胜利 <ArrowRight /></Link><a href={SOURCE_URL} target="_blank" rel="noreferrer"><Github />查看开源项目</a></div>
          <small><ShieldCheck />自托管 · 可导出 · 不接入第三方行为分析</small>
        </div>
        <div className="landing__board-preview" aria-label="小胜利收藏板预览">
          <div className="landing__grid" />
          <article className="preview-card preview-card--one"><span>生活 · LIFE</span><h3>今天按时起床了</h3><p>迎接了清晨的第一缕阳光</p></article>
          <article className="preview-card preview-card--two"><span>勇气 · COURAGE</span><h3>虽然焦虑，还是参加了会议</h3><p>这并不容易，但你还是面对了</p></article>
          <article className="preview-card preview-card--three"><span>关怀 · SELF-CARE</span><h3>允许自己休息</h3><p>照顾自己，也是重要的成就</p></article>
          <div className="preview-polaroid"><div /><em>Morning Gold</em></div>
          <strong>微光收藏板</strong>
        </div>
      </section>

      <section id="principles" className="landing__principles">
        <header><span>WHY LITTLE WINS</span><h2>不是另一个需要坚持的任务</h2><p>小小做到从“已经发生了什么”出发，而不是提醒你还有多少没有完成。</p></header>
        <div>{principles.map((item) => <PrincipleCard key={item.title} item={item} />)}</div>
      </section>

      <section className="landing__closing"><Sparkles /><h2>今天，有什么事情<br />是你做到了的？</h2><Link to="/start">先写下一件 <ArrowRight /></Link></section>
    </main>

    <footer className="landing__footer"><Brand /><p>小小做到是个人记录工具，不提供医疗诊断或治疗建议。</p><div><Link to="/about">项目与来源</Link><Link to="/privacy">隐私与使用约定</Link><a href={SOURCE_URL}>AGPL-3.0 源码</a></div></footer>
  </div>
);

export default LandingPage;
