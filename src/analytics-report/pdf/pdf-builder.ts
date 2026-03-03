// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
import { ReportData, ReportCharts, TopPost } from '../interfaces/report.interfaces';

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bgDark: '#0F172A',
  bgDark2: '#1E293B',
  bgMid: '#334155',
  bgLight: '#F8FAFC',
  primary: '#6366F1',
  primaryLight: '#EEF2FF',
  primaryDark: '#4F46E5',
  secondary: '#8B5CF6',
  teal: '#06B6D4',
  text: '#1E293B',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',
  border: '#E2E8F0',
  white: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
};

const PLATFORM_COLORS: Record<string, string> = {
  INSTAGRAM: '#E1306C',
  FACEBOOK: '#1877F2',
  TIKTOK: '#69C9D0',
  X: '#000000',
  LINKEDIN: '#0A66C2',
};

const W = 595.28;
const H = 841.89;
const M = 48;
const CW = W - M * 2; // ≈499 pts

// ─── Builder ──────────────────────────────────────────────────────────────────

export class PdfBuilder {
  private d!: InstanceType<typeof PDFDocument>;

  async build(data: ReportData, charts: ReportCharts): Promise<Buffer> {
    this.d = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const chunks: Buffer[] = [];
    this.d.on('data', (c: Buffer) => chunks.push(c));

    const done = new Promise<Buffer>((resolve, reject) => {
      this.d.on('end', () => resolve(Buffer.concat(chunks)));
      this.d.on('error', reject);
    });

    this.coverPage(data);
    this.d.addPage({ size: 'A4', margin: 0 });
    this.executiveSummaryPage(data);
    this.d.addPage({ size: 'A4', margin: 0 });
    this.growthPage(data, charts);
    this.d.addPage({ size: 'A4', margin: 0 });
    this.engagementPage(data);
    this.d.addPage({ size: 'A4', margin: 0 });
    this.topPostsPage(data);
    this.d.addPage({ size: 'A4', margin: 0 });
    this.recommendationsPage(data);

    this.d.end();
    return done;
  }

  // ─── Shared helpers ─────────────────────────────────────────────────────────

  private fmt(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  }

  private fmtDate(ts: string): string {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private header(pageLabel: string): void {
    const d = this.d;
    d.rect(0, 0, W, 5).fill(C.primary);
    d.rect(0, 5, W, 44).fill(C.bgDark);
    d.font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(C.white)
      .text('PLANER', M, 19, { lineBreak: false });
    d.font('Helvetica')
      .fontSize(9)
      .fillColor(C.textSubtle)
      .text(pageLabel, 0, 21, { width: W - M, align: 'right' });
    d.rect(0, 49, W, 1).fill(C.border);
  }

  private footer(): void {
    const d = this.d;
    d.rect(0, H - 36, W, 36).fill(C.bgLight);
    d.rect(0, H - 37, W, 1).fill(C.border);
    d.font('Helvetica')
      .fontSize(8)
      .fillColor(C.textSubtle)
      .text('Planer Analytics · Confidential', M, H - 22, { lineBreak: false });
    d.font('Helvetica')
      .fontSize(8)
      .fillColor(C.textSubtle)
      .text(String(new Date().getFullYear()), 0, H - 22, {
        width: W - M,
        align: 'right',
      });
  }

  private sectionLabel(text: string, x: number, y: number): void {
    this.d
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(C.primary)
      .text(text, x, y, { characterSpacing: 1.5, lineBreak: false });
  }

  private sectionTitle(text: string, x: number, y: number): void {
    this.d
      .font('Helvetica-Bold')
      .fontSize(22)
      .fillColor(C.text)
      .text(text, x, y, { lineBreak: false });
  }

  private divider(y: number): void {
    this.d
      .moveTo(M, y)
      .lineTo(W - M, y)
      .strokeColor(C.border)
      .lineWidth(0.75)
      .stroke();
  }

  private kpiCard(
    label: string,
    value: string,
    sub: string,
    x: number,
    y: number,
    w: number,
    h = 90,
    accent = C.primary,
  ): void {
    const d = this.d;
    d.roundedRect(x, y, w, h, 6).fill(C.bgLight);
    d.roundedRect(x, y, 3, h, 1.5).fill(accent);
    d.font('Helvetica')
      .fontSize(8)
      .fillColor(C.textMuted)
      .text(label.toUpperCase(), x + 14, y + 14, { characterSpacing: 0.5, lineBreak: false });
    d.font('Helvetica-Bold')
      .fontSize(26)
      .fillColor(C.text)
      .text(value, x + 14, y + 30, { lineBreak: false });
    d.font('Helvetica')
      .fontSize(8)
      .fillColor(C.textSubtle)
      .text(sub, x + 14, y + 68, { width: w - 28, lineBreak: false });
  }

  // ─── Page 1: Cover ──────────────────────────────────────────────────────────

  private coverPage(data: ReportData): void {
    const d = this.d;
    const { account, dateFrom, dateTo } = data;
    const pColor = PLATFORM_COLORS[account.platform] ?? C.primary;

    // Background
    d.rect(0, 0, W, H).fill(C.bgDark);

    // Decorative circles (top-right)
    d.save();
    d.opacity(0.05);
    d.circle(W + 60, 80, 220).fill(C.primary);
    d.restore();
    d.save();
    d.opacity(0.04);
    d.circle(W - 30, 300, 140).fill(C.secondary);
    d.restore();

    // Top accent bar
    d.rect(0, 0, W, 6).fill(C.primary);

    // Logo
    d.circle(M + 9, 72, 9).fill(C.primary);
    d.font('Helvetica-Bold')
      .fontSize(15)
      .fillColor(C.white)
      .text('PLANER', M + 24, 66, { lineBreak: false });

    // Separator
    d.moveTo(M, 108)
      .lineTo(W - M, 108)
      .strokeColor(C.bgMid)
      .lineWidth(0.5)
      .stroke();

    // Pre-title
    d.font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(C.primary)
      .text('ANALYTICS REPORT', M, 148, { characterSpacing: 2.5, lineBreak: false });

    // Title
    d.font('Helvetica-Bold').fontSize(50).fillColor(C.white).text('Social Media', M, 172);
    d.font('Helvetica-Bold')
      .fontSize(50)
      .fillColor(C.textSubtle)
      .text('Performance', M, 228);
    d.font('Helvetica-Bold')
      .fontSize(50)
      .fillColor(C.primaryDark)
      .text('Overview', M, 284);

    // Account card
    const cardY = 390;
    const cardH = 195;
    d.roundedRect(M, cardY, CW, cardH, 10).fill(C.bgDark2);

    d.font('Helvetica')
      .fontSize(8)
      .fillColor(C.textMuted)
      .text('ACCOUNT', M + 24, cardY + 22, { characterSpacing: 1.5, lineBreak: false });

    d.font('Helvetica-Bold')
      .fontSize(26)
      .fillColor(C.white)
      .text(`@${account.username}`, M + 24, cardY + 38, { lineBreak: false });

    // Platform badge
    d.roundedRect(M + 24, cardY + 80, 110, 24, 12).fill(pColor);
    d.font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(C.white)
      .text(account.platform, M + 24, cardY + 86, { width: 110, align: 'center', lineBreak: false });

    // Divider inside card
    d.moveTo(M + 24, cardY + 120)
      .lineTo(M + CW - 24, cardY + 120)
      .strokeColor(C.bgMid)
      .lineWidth(0.5)
      .stroke();

    d.font('Helvetica')
      .fontSize(8)
      .fillColor(C.textMuted)
      .text('REPORT PERIOD', M + 24, cardY + 133, { characterSpacing: 1.5, lineBreak: false });

    const fromStr = dateFrom.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const toStr = dateTo.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    d.font('Helvetica-Bold')
      .fontSize(13)
      .fillColor(C.white)
      .text(`${fromStr}  —  ${toStr}`, M + 24, cardY + 151, { lineBreak: false });

    // Generated timestamp
    const genDate = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    d.font('Helvetica')
      .fontSize(9)
      .fillColor(C.bgMid)
      .text(
        `Generated on ${genDate}  ·  Powered by Planer`,
        0,
        H - 52,
        { width: W, align: 'center' },
      );

    // Bottom accent bar
    d.rect(0, H - 6, W, 6).fill(C.primary);
  }

  // ─── Page 2: Executive Summary ───────────────────────────────────────────────

  private executiveSummaryPage(data: ReportData): void {
    const d = this.d;
    const { metrics, account, bestPost, dateFrom, dateTo } = data;
    d.rect(0, 0, W, H).fill(C.white);
    this.header('Executive Summary');
    this.footer();

    const CONTENT_Y = 62;

    this.sectionLabel('EXECUTIVE SUMMARY', M, CONTENT_Y);
    this.sectionTitle('Performance Overview', M, CONTENT_Y + 16);

    const periodStr = `${dateFrom.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${dateTo.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    d.font('Helvetica')
      .fontSize(10)
      .fillColor(C.textMuted)
      .text(`@${account.username}  ·  ${periodStr}`, M, CONTENT_Y + 46, { lineBreak: false });

    // Summary paragraph
    const growth = metrics.followerGrowthPct;
    const growthStr =
      growth !== 0
        ? ` Follower count ${growth > 0 ? 'grew' : 'declined'} by ${Math.abs(growth).toFixed(1)}% over the period.`
        : '';
    const summary =
      `During this reporting period, @${account.username} recorded ${this.fmt(metrics.impressions)} total impressions reaching ` +
      `${this.fmt(metrics.reach)} unique accounts. The account achieved a ${metrics.engagementRate.toFixed(2)}% engagement rate ` +
      `across ${metrics.totalPosts} published posts.${growthStr}`;

    const paraY = CONTENT_Y + 66;
    d.roundedRect(M, paraY, CW, 56, 6).fill(C.primaryLight);
    d.roundedRect(M, paraY, 3, 56, 1.5).fill(C.primary);
    d.font('Helvetica')
      .fontSize(9.5)
      .fillColor('#4338CA')
      .text(summary, M + 16, paraY + 12, { width: CW - 32 });

    // KPI grid
    const kpiY = paraY + 72;
    const kpiW = (CW - 20) / 3;
    const kpiGap = 10;

    const sign = (n: number) => (n > 0 ? '+' : '');
    const kpis = [
      {
        label: 'Total Followers',
        value: this.fmt(metrics.followerCount),
        sub: 'Current follower count',
        accent: C.primary,
      },
      {
        label: 'Followers Growth',
        value: `${sign(metrics.followerGrowthPct)}${metrics.followerGrowthPct.toFixed(1)}%`,
        sub: 'Change during period',
        accent: metrics.followerGrowthPct >= 0 ? C.success : '#EF4444',
      },
      {
        label: 'Impressions',
        value: this.fmt(metrics.impressions),
        sub: 'Total content views',
        accent: C.teal,
      },
      {
        label: 'Total Reach',
        value: this.fmt(metrics.reach),
        sub: 'Unique accounts reached',
        accent: C.secondary,
      },
      {
        label: 'Engagement Rate',
        value: `${metrics.engagementRate.toFixed(2)}%`,
        sub: '(Likes + Comments + Saves) / Reach',
        accent: C.warning,
      },
      {
        label: 'Total Posts',
        value: String(metrics.totalPosts),
        sub: 'Published in period',
        accent: C.primary,
      },
    ];

    kpis.forEach((kpi, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = M + col * (kpiW + kpiGap);
      const y = kpiY + row * (94 + kpiGap);
      this.kpiCard(kpi.label, kpi.value, kpi.sub, x, y, kpiW, 90, kpi.accent);
    });

    // Best post
    const bestY = kpiY + 2 * (94 + kpiGap) + 18;
    this.sectionLabel('BEST PERFORMING POST', M, bestY);
    this.divider(bestY + 14);

    if (bestPost) {
      const bpY = bestY + 22;
      d.roundedRect(M, bpY, CW, 78, 6).fill(C.bgLight);

      // Media type badge
      d.roundedRect(M + 14, bpY + 14, 58, 20, 10).fill(C.primary);
      d.font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(C.white)
        .text(bestPost.mediaType, M + 14, bpY + 19, { width: 58, align: 'center', lineBreak: false });

      // Caption
      const caption =
        bestPost.caption.substring(0, 130) +
        (bestPost.caption.length > 130 ? '...' : '');
      d.font('Helvetica')
        .fontSize(9)
        .fillColor(C.text)
        .text(caption, M + 82, bpY + 14, { width: CW - 200, lineBreak: true });

      // Stats
      const statsX = M + 14;
      const statsY = bpY + 52;
      [
        { label: 'Likes', v: bestPost.likes },
        { label: 'Comments', v: bestPost.comments },
        { label: 'Reach', v: bestPost.reach },
        { label: 'Eng.', v: `${bestPost.engagementRate.toFixed(1)}%` },
      ].forEach((s, i) => {
        d.font('Helvetica-Bold')
          .fontSize(9)
          .fillColor(C.text)
          .text(typeof s.v === 'number' ? this.fmt(s.v) : s.v, statsX + i * 90, statsY, { lineBreak: false });
        d.font('Helvetica')
          .fontSize(8)
          .fillColor(C.textSubtle)
          .text(s.label, statsX + i * 90, statsY + 13, { lineBreak: false });
      });

      // Date (right-aligned)
      d.font('Helvetica')
        .fontSize(8)
        .fillColor(C.textSubtle)
        .text(this.fmtDate(bestPost.timestamp), 0, bpY + 58, {
          width: W - M,
          align: 'right',
        });
    } else {
      d.font('Helvetica')
        .fontSize(10)
        .fillColor(C.textMuted)
        .text('No post data available for this period.', M, bestY + 24, { lineBreak: false });
    }
  }

  // ─── Page 3: Growth Charts ───────────────────────────────────────────────────

  private growthPage(data: ReportData, charts: ReportCharts): void {
    const d = this.d;
    d.rect(0, 0, W, H).fill(C.white);
    this.header('Growth Overview');
    this.footer();

    let y = 62;

    this.sectionLabel('GROWTH & REACH', M, y);
    this.sectionTitle('Audience Growth', M, y + 16);
    d.font('Helvetica')
      .fontSize(9.5)
      .fillColor(C.textMuted)
      .text('Daily impressions and reach over the selected period.', M, y + 46, { lineBreak: false });

    y += 68;
    this.divider(y);
    y += 16;

    // Impressions chart
    this.sectionLabel('IMPRESSIONS', M, y);
    y += 14;

    if (charts.impressions) {
      d.image(charts.impressions, M, y, { width: CW });
      y += Math.round(CW * (300 / 900)) + 10;
    } else {
      this.noDataBox(M, y, CW, 140);
      y += 155;
    }

    this.divider(y);
    y += 16;

    // Reach chart
    this.sectionLabel('REACH', M, y);
    y += 14;

    if (charts.reach) {
      d.image(charts.reach, M, y, { width: CW });
    } else {
      this.noDataBox(M, y, CW, 140);
    }
  }

  private noDataBox(x: number, y: number, w: number, h: number): void {
    this.d.roundedRect(x, y, w, h, 6).fill(C.bgLight);
    this.d
      .font('Helvetica')
      .fontSize(10)
      .fillColor(C.textSubtle)
      .text('No data available for this period.', x, y + h / 2 - 6, {
        width: w,
        align: 'center',
        lineBreak: false,
      });
  }

  // ─── Page 4: Engagement Breakdown ────────────────────────────────────────────

  private engagementPage(data: ReportData): void {
    const d = this.d;
    const { metrics } = data;
    d.rect(0, 0, W, H).fill(C.white);
    this.header('Engagement Breakdown');
    this.footer();

    let y = 62;
    this.sectionLabel('ENGAGEMENT', M, y);
    this.sectionTitle('Engagement Breakdown', M, y + 16);
    d.font('Helvetica')
      .fontSize(9.5)
      .fillColor(C.textMuted)
      .text('Aggregated engagement metrics across all posts in the selected period.', M, y + 46, { lineBreak: false });

    y += 68;
    this.divider(y);
    y += 20;

    // Engagement metrics bars
    const engMax = Math.max(
      metrics.totalLikes,
      metrics.totalComments,
      metrics.totalShares,
      metrics.totalSaves,
      1,
    );

    const bars: Array<{ label: string; value: number; color: string }> = [
      { label: 'Likes', value: metrics.totalLikes, color: '#E1306C' },
      { label: 'Comments', value: metrics.totalComments, color: C.teal },
      { label: 'Shares', value: metrics.totalShares, color: C.secondary },
      { label: 'Saves', value: metrics.totalSaves, color: C.warning },
    ];

    const barRowH = 64;
    bars.forEach((bar, i) => {
      const rowY = y + i * barRowH;
      this.drawEngRow(bar.label, bar.value, engMax, bar.color, M, rowY, CW);
    });

    y += bars.length * barRowH + 20;
    this.divider(y);
    y += 20;

    // Engagement rate formula box
    this.sectionLabel('ENGAGEMENT RATE', M, y);
    y += 14;

    d.roundedRect(M, y, CW, 110, 8).fill(C.bgLight);
    d.roundedRect(M, y, 3, 110, 1.5).fill(C.primary);

    d.font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(C.text)
      .text('How is engagement rate calculated?', M + 20, y + 18, { lineBreak: false });

    d.font('Helvetica')
      .fontSize(10)
      .fillColor(C.textMuted)
      .text('Engagement Rate  =  (Likes + Comments + Saves) / Total Reach  × 100', M + 20, y + 40, { lineBreak: false });

    d.roundedRect(M + 20, y + 62, 240, 30, 6).fill(C.primaryLight);
    d.font('Helvetica-Bold')
      .fontSize(22)
      .fillColor(C.primary)
      .text(`${metrics.engagementRate.toFixed(2)}%`, M + 36, y + 68, { lineBreak: false });
    d.font('Helvetica')
      .fontSize(9)
      .fillColor(C.textMuted)
      .text('Your Engagement Rate', M + 110, y + 76, { lineBreak: false });

    y += 130;
    this.divider(y);
    y += 20;

    // 4-cell KPI summary row
    this.sectionLabel('TOTALS SUMMARY', M, y);
    y += 14;

    const cellW = (CW - 30) / 4;
    const totals = [
      { label: 'Total Likes', v: this.fmt(metrics.totalLikes) },
      { label: 'Total Comments', v: this.fmt(metrics.totalComments) },
      { label: 'Total Shares', v: this.fmt(metrics.totalShares) },
      { label: 'Total Saves', v: this.fmt(metrics.totalSaves) },
    ];
    totals.forEach((t, i) => {
      const cx = M + i * (cellW + 10);
      d.roundedRect(cx, y, cellW, 64, 6).fill(C.bgLight);
      d.font('Helvetica').fontSize(8).fillColor(C.textMuted).text(t.label, cx + 12, y + 12, { lineBreak: false });
      d.font('Helvetica-Bold').fontSize(22).fillColor(C.text).text(t.v, cx + 12, y + 28, { lineBreak: false });
    });
  }

  private drawEngRow(
    label: string,
    value: number,
    max: number,
    color: string,
    x: number,
    y: number,
    w: number,
  ): void {
    const d = this.d;
    const barAreaW = w - 160;
    const filledW = max > 0 ? Math.max((value / max) * barAreaW, 0) : 0;

    // Label
    d.font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(C.text)
      .text(label, x, y + 14, { width: 80, lineBreak: false });

    // Track
    d.roundedRect(x + 90, y + 16, barAreaW, 14, 7).fill(C.border);

    // Fill
    if (filledW > 0) {
      d.roundedRect(x + 90, y + 16, filledW, 14, 7).fill(color);
    }

    // Value
    d.font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(C.text)
      .text(this.fmt(value), x + 90 + barAreaW + 12, y + 14, { lineBreak: false });
  }

  // ─── Page 5: Top Posts ───────────────────────────────────────────────────────

  private topPostsPage(data: ReportData): void {
    const d = this.d;
    d.rect(0, 0, W, H).fill(C.white);
    this.header('Top Performing Posts');
    this.footer();

    let y = 62;
    this.sectionLabel('TOP POSTS', M, y);
    this.sectionTitle('Top Performing Posts', M, y + 16);
    d.font('Helvetica')
      .fontSize(9.5)
      .fillColor(C.textMuted)
      .text('Ranked by engagement rate. Showing top 10 posts.', M, y + 46, { lineBreak: false });

    y += 68;
    this.divider(y);
    y += 8;

    if (data.topPosts.length === 0) {
      this.noDataBox(M, y + 10, CW, 120);
      return;
    }

    // Table columns: Caption | Date | Likes | Comments | Reach | Eng%
    const cols = [
      { label: 'CAPTION', w: 172 },
      { label: 'DATE', w: 65 },
      { label: 'LIKES', w: 52 },
      { label: 'COMMENTS', w: 68 },
      { label: 'REACH', w: 60 },
      { label: 'ENG. %', w: 82 },
    ];

    // Header row
    const headerH = 26;
    d.rect(M, y, CW, headerH).fill(C.bgDark);

    let cx = M;
    cols.forEach((col) => {
      d.font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(C.textSubtle)
        .text(col.label, cx + 8, y + 9, {
          width: col.w - 8,
          align: col.label === 'CAPTION' || col.label === 'DATE' ? 'left' : 'right',
          lineBreak: false,
          characterSpacing: 0.5,
        });
      cx += col.w;
    });

    y += headerH;

    // Data rows
    const rowH = 36;
    data.topPosts.slice(0, 10).forEach((post, idx) => {
      const rowY = y + idx * rowH;

      // Alternating row bg
      if (idx % 2 === 1) {
        d.rect(M, rowY, CW, rowH).fill(C.bgLight);
      }

      // Bottom border
      d.moveTo(M, rowY + rowH)
        .lineTo(M + CW, rowY + rowH)
        .strokeColor(C.border)
        .lineWidth(0.5)
        .stroke();

      this.tableRow(post, cols, M, rowY, rowH);
    });
  }

  private tableRow(
    post: TopPost,
    cols: Array<{ label: string; w: number }>,
    startX: number,
    y: number,
    rowH: number,
  ): void {
    const d = this.d;
    const textY = y + (rowH - 9) / 2;
    let cx = startX;

    // Caption
    const caption =
      post.caption.substring(0, 48) + (post.caption.length > 48 ? '…' : '');
    d.font('Helvetica').fontSize(8).fillColor(C.text).text(caption, cx + 8, textY, {
      width: cols[0].w - 16,
      lineBreak: false,
    });
    cx += cols[0].w;

    // Date
    const dt = new Date(post.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    d.font('Helvetica').fontSize(8).fillColor(C.textMuted).text(dt, cx + 8, textY, {
      width: cols[1].w - 10,
      lineBreak: false,
    });
    cx += cols[1].w;

    // Numeric columns
    const numCols: Array<{ v: string; i: number }> = [
      { v: this.fmt(post.likes), i: 2 },
      { v: this.fmt(post.comments), i: 3 },
      { v: this.fmt(post.reach), i: 4 },
      { v: `${post.engagementRate.toFixed(1)}%`, i: 5 },
    ];
    numCols.forEach(({ v, i }) => {
      const colW = cols[i].w;
      d.font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(C.text)
        .text(v, cx, textY, { width: colW - 10, align: 'right', lineBreak: false });
      cx += colW;
    });
  }

  // ─── Page 6: Recommendations ─────────────────────────────────────────────────

  private recommendationsPage(data: ReportData): void {
    const d = this.d;
    d.rect(0, 0, W, H).fill(C.white);
    this.header('Insights & Recommendations');
    this.footer();

    let y = 62;
    this.sectionLabel('RECOMMENDATIONS', M, y);
    this.sectionTitle('Insights & Recommendations', M, y + 16);
    d.font('Helvetica')
      .fontSize(9.5)
      .fillColor(C.textMuted)
      .text('AI-assisted insights based on your account metrics and content performance.', M, y + 46, { lineBreak: false });

    y += 68;
    this.divider(y);
    y += 20;

    if (data.recommendations.length === 0) {
      this.noDataBox(M, y, CW, 120);
      return;
    }

    const accent = [C.primary, C.teal, C.success, C.warning, C.secondary];

    data.recommendations.forEach((rec, i) => {
      const boxY = y;
      const accentColor = accent[i % accent.length];

      // Number circle
      d.circle(M + 16, boxY + 22, 16).fill(accentColor);
      d.font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(C.white)
        .text(String(i + 1), M + 16, boxY + 16, { width: 0, align: 'center', lineBreak: false });

      // Text area
      const textX = M + 42;
      const textW = CW - 46;

      d.font('Helvetica').fontSize(10).fillColor(C.text).text(rec, textX, boxY + 12, {
        width: textW,
        align: 'left',
      });

      // Use doc.y after text to determine next position
      y = this.d.y + 16;

      this.divider(y - 8);
    });

    // Closing note
    y += 8;
    d.roundedRect(M, y, CW, 60, 8).fill(C.primaryLight);
    d.roundedRect(M, y, 3, 60, 1.5).fill(C.primary);
    d.font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#4338CA')
      .text('Keep growing with Planer', M + 20, y + 14, { lineBreak: false });
    d.font('Helvetica')
      .fontSize(9)
      .fillColor('#4338CA')
      .text(
        'Schedule, publish, and analyze your social content in one place. Track your progress over time with regular reports.',
        M + 20,
        y + 30,
        { width: CW - 40 },
      );
  }
}
