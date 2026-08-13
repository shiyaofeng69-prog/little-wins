import { ArrowRight, Github, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import './AboutPage.css';
import './LandingPage.css';

const SOURCE_URL = 'https://github.com/shiyaofeng69-prog/little-wins';

const AboutPage = () => (
  <div className="about-page landing">
    <header className="landing__nav">
      <Link className="landing__brand" to="/"><span><Sparkles size={17} /></span><strong>小小做到</strong><i>/</i><b>ABOUT</b></Link>
      <nav><Link to="/">首页</Link><a href="#origin">项目来源</a><a href={SOURCE_URL}>源码</a></nav>
      <Link className="landing__nav-cta" to="/dashboard">进入微光板 <ArrowRight size={15} /></Link>
    </header>

    <main className="about__content">
      <header className="about__header"><span>THE STORY BEHIND LITTLE WINS</span><h1>我们想记录的，<br />不是完成率。</h1><p>而是那些很容易被自己忽略，却真实发生过的努力。</p></header>

      <section className="about__section"><h2>为什么做小小做到</h2><p>有些人很难持续专注地完成事情。计划被打断、任务没有做完，常常会迅速变成“我是不是不够好”的证据。对 ADHD 或有相似注意力困难的人来说，一个强调连续、效率和完成率的工具，有时反而会增加负担。</p><p>小小做到选择从另一个方向开始：不追问还有多少没完成，而是把已经发生的努力保存下来。打开文档、回复消息、按时吃药、允许自己休息——这些行动都不应该因为微小而消失。</p></section>

      <section className="about__section"><h2>我们的产品原则</h2><ul><li><strong>减少决定：</strong>用户只需要写内容，系统负责分类和整理。</li><li><strong>不惩罚中断：</strong>不使用断签、归零和落后警告。</li><li><strong>反馈行为：</strong>承认具体行动，不评价人格，不承诺医疗效果。</li><li><strong>允许修正：</strong>系统可以帮助理解，但最终解释权属于用户。</li><li><strong>数据可带走：</strong>支持导出与自托管，不出售个人记录。</li></ul></section>

      <section id="origin" className="about__section about__origin"><h2>开源来源与独立身份</h2><p>小小做到的早期工程基础来自 Shirsak M. 创建的开源项目 <a href="https://github.com/shirsakm/nightlio">Nightlio</a>。我们感谢它提供的认证、Flask API、SQLite 存储与自托管基础。</p><p>2026 年 8 月起，我们围绕“看见已经发生的努力”重新定义产品，重构了信息架构、交互流程、视觉系统、中文内容、自动分类、收藏板、时间线与年度回顾。</p><p>小小做到是一个独立的修改版本，不是 Nightlio 官方版本，也不受原作者背书。原始部分和新增贡献的版权分别属于各自作者。</p><div><Github /><p>项目依照 GNU AGPL-3.0 开源。完整修改说明见仓库中的 <a href={`${SOURCE_URL}/blob/main/NOTICE.md`}>NOTICE.md</a>。</p></div></section>

      <section className="about__section"><h2>它不是什么</h2><p>小小做到不是医疗产品，不进行 ADHD 诊断，也不替代专业治疗。它只是一块安静的看板，帮助你在困难的日子里，仍然看见自己做过的事情。</p></section>
    </main>

    <footer className="landing__footer"><Link className="landing__brand" to="/"><span><Sparkles size={17} /></span><strong>小小做到</strong></Link><p>每一个做到，都值得被看见。</p><div><a href={SOURCE_URL}>AGPL-3.0 源码</a></div></footer>
  </div>
);

export default AboutPage;
