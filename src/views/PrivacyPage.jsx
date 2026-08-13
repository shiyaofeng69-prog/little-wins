import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import './AboutPage.css';
import './LandingPage.css';

const PrivacyPage = () => (
  <div className="about-page landing">
    <header className="landing__nav">
      <Link className="landing__brand" to="/"><span><Sparkles size={17} /></span><strong>小小做到</strong><i>/</i><b>PRIVACY</b></Link>
      <nav><Link to="/">首页</Link><Link to="/about">关于</Link></nav>
      <Link className="landing__nav-cta" to="/dashboard">进入微光板 <ArrowRight size={15} /></Link>
    </header>
    <main className="about__content">
      <header className="about__header"><span>PRIVACY & PRODUCT BOUNDARIES</span><h1>你的记录，<br />首先属于你。</h1><p>最后更新：2026 年 8 月 13 日</p></header>
      <section className="about__section"><h2>我们保存什么</h2><p>为提供记录和回顾功能，服务会保存账户标识、正文、分类、感受、日期时间、珍藏和存档状态。浏览器还会在当前设备保存登录凭据、未提交草稿和少量界面偏好。</p></section>
      <section className="about__section"><h2>数据如何使用</h2><p>这些信息只用于登录、保存、整理、展示和导出你的记录。项目默认不接入第三方行为分析，不出售个人记录，也不会用记录内容进行广告定向。</p></section>
      <section className="about__section"><h2>身份验证与自托管</h2><p>实例可使用 Google OAuth 或本地访问密码。Google 账户信息仅用于身份验证。自托管者负责部署环境、HTTPS、访问密码、备份和服务器安全。</p></section>
      <section className="about__section"><h2>带走与删除</h2><p>你可以在设置页导出完整记录；单条记录可先存档，也可永久删除。永久删除不可恢复。账户级删除与导入仍在开发中，在功能完成前可由实例管理员依据数据库备份和部署说明处理。</p></section>
      <section className="about__section"><h2>它不是医疗产品</h2><p>小小做到不提供 ADHD 或其他健康状况的诊断、治疗、危机干预或医疗建议，也不能替代医生和专业支持。如果你正处于紧急危险中，请联系当地紧急服务或可信赖的人。</p></section>
      <section className="about__section"><h2>使用约定</h2><p>请勿利用本服务存储违法内容、攻击他人或绕过访问控制。软件按 AGPL-3.0 开源许可提供；不同自托管实例可能有各自的数据管理者和补充规则。</p></section>
      <section className="about__section"><h2>问题与反馈</h2><p>本项目是公开开发的软件。关于数据处理、删除或安全问题，请通过项目仓库的 Issue 渠道联系实例维护者，并避免在公开 Issue 中粘贴私人记录。</p></section>
    </main>
    <footer className="landing__footer"><Link className="landing__brand" to="/"><span><Sparkles size={17} /></span><strong>小小做到</strong></Link><p>温柔记录，不做诊断。</p><div><Link to="/about">关于产品</Link><Link to="/privacy">隐私与使用约定</Link></div></footer>
  </div>
);

export default PrivacyPage;
