'use strict';
/**
 * sites-config.js — 全局站点配置（唯一数据源）
 *
 * 新增站点：在 SITES 数组加一行，所有监控/日报自动生效。
 *
 * 字段说明：
 *   id          — 内部标识，与 projects.json 一致
 *   name        — 展示名
 *   domain      — 裸域名（不含 https://）
 *   color       — 品牌色（HEX）
 *   dir         — 本地仓库路径（Windows 绝对路径；FTP 站点填 null）
 *   repo        — GitHub 仓库 slug（FTP 站点填 null）
 *   branch      — 统一使用 master 分支（所有站点规范，禁止混用 main）
 *   ftp_hosted  — true = FTP 托管，只监控 DNS，不执行 Git 修复
 *   ga_numeric  — GA4 数值属性 ID（非 G-XXXXXXX，是纯数字 ID）
 *   adsense     — 'pending' | 'approved' | 'skip'
 *
 * ⚠️ 分支规范：所有仓库统一使用 master 分支，GitHub 默认分支也应设为 master。
 *    如需删除多余的 main 分支：先在 GitHub Settings→General 将默认分支改为 master，
 *    再执行 git push origin --delete main
 */

const SITES = [
  {
    id:         'wordcasefix',
    name:       'WordCaseFix',
    domain:     'wordcasefix.com',
    color:      '#5b5bd6',
    dir:        'C:\\Users\\Administrator\\wordcasefix',
    repo:       'woxxxxxxxx/wordcasefix',
    branch:     'master', // 统一使用 master，GitHub 默认分支须手动设为 master 并删除 main
    ftp_hosted: false,
    ga_numeric: '539531639',
    adsense:    'pending',
  },
  {
    id:         'vestcalc',
    name:       'VestCalc',
    domain:     'vestcalc.com',
    color:      '#0d9488',
    dir:        'C:\\Users\\Administrator\\vestcalc',
    repo:       'woxxxxxxxx/vestcalc',
    branch:     'master',
    ftp_hosted: false,
    ga_numeric: '539700100',
    adsense:    'pending',
  },
  {
    id:         'notiontemplafix',
    name:       'NotionTemplaFix',
    domain:     'notiontemplafix.com',
    color:      '#000000',
    dir:        'C:\\Users\\Administrator\\notiontemplafix',
    repo:       'woxxxxxxxx/notiontemplafix',
    branch:     'master',
    ftp_hosted: true,   // FTP 托管，只监控 DNS
    ga_numeric: '539119398',
    adsense:    'skip',
  },
  {
    id:         'contractfixpro',
    name:       'ContractFixPro',
    domain:     'contractfixpro.com',
    color:      '#2563eb',
    dir:        'C:\\Users\\Administrator\\contractfixpro',
    repo:       'woxxxxxxxx/contractfixpro',
    branch:     'master',
    ftp_hosted: false,
    ga_numeric: '539948742',
    adsense:    'pending',
  },
  {
    id:         'billingfixpro',
    name:       'BillingFixPro',
    domain:     'billingfixpro.com',
    color:      '#0891b2',
    dir:        'C:\\Users\\Administrator\\billingfixpro',
    repo:       'woxxxxxxxx/billingfixpro',
    branch:     'master',
    ftp_hosted: false,
    ga_numeric: '540289117',
    adsense:    'pending',
  },
  {
    id:         'payrollfixpro',
    name:       'PayrollFixPro',
    domain:     'payrollfixpro.com',
    color:      '#0f766e',
    dir:        'C:\\Users\\Administrator\\payrollfixpro',
    repo:       'woxxxxxxxx/payrollfixpro',
    branch:     'master',
    ftp_hosted: false,
    ga_numeric: '540359696',
    adsense:    'pending',
  },
  {
    id:         'coveragefixpro',
    name:       'CoverageFixPro',
    domain:     'coveragefixpro.com',
    color:      '#1d4ed8',
    dir:        'C:\\Users\\Administrator\\coveragefixpro',
    repo:       'woxxxxxxxx/coveragefixpro',
    branch:     'master',
    ftp_hosted: true,
    ga_numeric: '540484051',
    adsense:    'pending',
  },
  {
    id:         'insurancetipspro',
    name:       'InsuranceTipsPro',
    domain:     'insurancetipspro.com',
    color:      '#1e40af',
    dir:        'C:\\Users\\Administrator\\insurancetipspro',
    repo:       'woxxxxxxxx/insurancetipspro',
    branch:     'master',
    ftp_hosted: true,
    ga_numeric: '540994505',
    adsense:    'pending',
  },
];

/**
 * 返回适合 monitor-engine 使用的格式（含 projects.json 补充字段）
 * @param {object} [projectsMap] — { [id]: projectsJsonEntry }，可选，用于合并 search_console_pages
 */
function getSitesForMonitor(projectsMap = {}) {
  return SITES.map(s => ({
    id:                   s.id,
    domain:               s.domain,
    local:                s.ftp_hosted ? null : s.dir,
    repo:                 s.repo,
    branch:               s.branch || 'master',
    adsense:              s.adsense,
    ftp_hosted:           s.ftp_hosted,
    // 动态运营数据从 projects.json 读取
    search_console_pages: projectsMap[s.id]?.search_console_pages ?? null,
  }));
}

/**
 * 返回适合 GitHub Pages 检查的配置列表（过滤掉 FTP 站点）
 */
function getGithubPagesRepos() {
  return SITES
    .filter(s => !s.ftp_hosted && s.repo)
    .map(s => ({ repo: s.repo, expectedDomain: s.domain, projectId: s.id, branch: s.branch || 'master' }));
}

/**
 * 返回适合 GA4 API 使用的 { [name]: numericId } 映射
 */
function getGA4Properties() {
  const map = {};
  for (const s of SITES) {
    if (s.ga_numeric) map[s.name] = s.ga_numeric;
  }
  return map;
}

module.exports = { SITES, getSitesForMonitor, getGithubPagesRepos, getGA4Properties };
