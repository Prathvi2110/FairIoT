import { Activity, ArrowRight, ArrowUpRight, BarChart3, Boxes, Check, CircleHelp, Cpu, Database, Network, Radio, ShieldCheck, Signal, Waypoints, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

const modules = [
  { key: 'sensor', icon: Radio, title: 'Sensor fairness', detail: 'Compare accuracy, response time, calibration, and missing readings across device groups.' },
  { key: 'actuator', icon: Zap, title: 'Actuator fairness', detail: 'Inspect command latency, success rates, and consistency of device response.' },
  { key: 'communication', icon: Network, title: 'Communication fairness', detail: 'Surface differences in latency, packet loss, throughput, and network availability.' },
  { key: 'resource_allocation', icon: Cpu, title: 'Resource allocation', detail: 'Measure how bandwidth, compute, memory, and energy are distributed.' },
];

export function LandingPage() {
  return (
    <div>
      <header className="public-header">
        <Logo />
        <nav className="public-nav" aria-label="Main navigation">
          <a href="#modules">Fairness modules</a>
          <a href="#method">How it works</a>
          <a href="#principles">Principles</a>
        </nav>
        <div className="public-actions">
          <Link to="/login" className="btn btn-secondary btn-sm">Log in</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Create account <ArrowRight size={14} /></Link>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-inner">
            <div className="hero-copy fade-in">
              <div className="eyebrow"><Signal size={13} /> IoT performance, made inspectable</div>
              <h1>Fairness starts<br />with <em>evidence.</em></h1>
              <p>Compare how IoT hardware performs across devices, groups, and conditions—with clear methods, visible uncertainty, and explanations you can actually use.</p>
              <div className="hero-ctas">
                <Link to="/register" className="btn btn-primary">Analyze your data <ArrowRight size={15} /></Link>
                <a href="#method" className="btn btn-secondary">See how it works <ArrowUpRight size={14} /></a>
              </div>
              <div className="hero-note"><ShieldCheck size={14} /> A performance gap is a signal to investigate—not a verdict about cause.</div>
            </div>
            <div className="hero-art" aria-label="Illustration of grouped device performance comparisons">
              <div className="signal-grid" />
              <div className="signal-float float-one"><Activity size={17} /><div><b>4 analysis lenses</b><span>One clear comparison workflow</span></div></div>
              <div className="signal-card">
                <div className="signal-card-top"><span className="signal-card-title">Performance by device group</span><span className="signal-pill">ILLUSTRATION</span></div>
                <div className="signal-group"><span>Group A</span><div className="signal-bar"><span style={{ width: '84%' }} /></div><span className="signal-value">mean</span></div>
                <div className="signal-group"><span>Group B</span><div className="signal-bar"><span style={{ width: '77%' }} /></div><span className="signal-value">median</span></div>
                <div className="signal-group"><span>Group C</span><div className="signal-bar"><span style={{ width: '81%' }} /></div><span className="signal-value">range</span></div>
                <div className="signal-divider" />
                <div className="signal-bottom"><span>Illustrative structure · not measured data</span><span className="signal-badge"><Check size={12} /> Test choices</span></div>
              </div>
              <div className="signal-float float-two"><Database size={16} /><div><b>Your data, your context</b><span>Upload a dataset to begin</span></div></div>
            </div>
          </div>
        </section>

        <section className="section" id="modules">
          <div className="section-header">
            <div><div className="eyebrow">Four connected perspectives</div><h2>Fairness across the IoT stack.</h2><p className="section-subtitle">Start with the question you have. Use the same transparent workflow to compare sensing, actuation, communication, and shared resources.</p></div>
            <Link to="/register" className="btn btn-secondary">Explore the workspace <ArrowRight size={14} /></Link>
          </div>
          <div className="module-grid">
            {modules.map(({ key, icon: Icon, title, detail }) => <Link key={key} to="/register" className="module-card">
              <div className="module-icon"><Icon size={19} /></div><h3>{title}</h3><p>{detail}</p><span className="module-link">Explore module <ArrowRight size={13} /></span>
            </Link>)}
          </div>
        </section>

        <section className="how-section" id="method">
          <div className="how-inner">
            <div className="eyebrow">A traceable workflow</div><h2>From raw measurements<br />to a reasoned comparison.</h2>
            <p className="section-subtitle">Every result preserves the choices that shaped it—so teams can review, reproduce, and question what the data suggests.</p>
            <div className="steps-grid">
              <div className="step-card"><span className="step-num">01 / PREPARE</span><h3>Bring your data</h3><p>Upload a CSV or Excel file. FairIoT profiles its columns, missing values, and duplicates without assuming a particular schema.</p></div>
              <div className="step-card"><span className="step-num">02 / DEFINE</span><h3>Choose a fair test</h3><p>Select the groups and performance metric, set its direction and threshold, and optionally standardize across observed context strata.</p></div>
              <div className="step-card"><span className="step-num">03 / REVIEW</span><h3>Inspect the evidence</h3><p>Compare group statistics, sample sizes, uncertainty, and limitations. Export the analysis and keep a private history.</p></div>
            </div>
          </div>
        </section>

        <section className="section" id="principles">
          <div className="section-header"><div><div className="eyebrow">Designed for careful decisions</div><h2>Transparent by default.</h2><p className="section-subtitle">Hardware performance depends on more than the device. FairIoT keeps the test visible and the interpretation modest.</p></div></div>
          <div className="module-grid">
            <article className="module-card"><div className="module-icon"><BarChart3 size={19} /></div><h3>Explain the comparison</h3><p>See group means, medians, ranges, sample sizes, and approximate confidence intervals where they can be estimated.</p></article>
            <article className="module-card"><div className="module-icon"><Boxes size={19} /></div><h3>Fit the data you have</h3><p>Columns are inferred from uploaded data. You choose the grouping and metric instead of adapting to a fixed demo schema.</p></article>
            <article className="module-card"><div className="module-icon"><Waypoints size={19} /></div><h3>Keep context in view</h3><p>Workload, calibration, environment, network conditions, and service requirements can all affect observed performance.</p></article>
            <article className="module-card"><div className="module-icon"><CircleHelp size={19} /></div><h3>Separate signal from cause</h3><p>A difference can warrant investigation, but it does not by itself establish discrimination, a cause, or universal fairness.</p></article>
          </div>
        </section>
      </main>

      <div className="care-note"><strong>Interpretation note.</strong> Equal performance is not always equitable performance. Results describe the selected dataset, grouping, metric, direction, threshold, and method; they do not account for unmeasured conditions.</div>
      <footer className="public-footer"><Logo compact={false} /><span>Making IoT hardware performance fair, transparent, and explainable.</span><span>© {new Date().getFullYear()} FairIoT</span></footer>
    </div>
  );
}
