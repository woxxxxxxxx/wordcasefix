// FAQ accordion
document.querySelectorAll('.faq-q').forEach(q => {
  q.addEventListener('click', () => {
    const item = q.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

// Mobile nav
const hamburger = document.querySelector('.hamburger');
const nav = document.querySelector('nav');
if (hamburger && nav) {
  hamburger.addEventListener('click', () => nav.classList.toggle('open'));
}

// Search
const searchInput = document.getElementById('toolSearch');
if (searchInput) {
  searchInput.addEventListener('input', function() {
    const q = this.value.toLowerCase();
    document.querySelectorAll('.tool-card, [data-searchable]').forEach(el => {
      const text = el.textContent.toLowerCase();
      el.style.display = text.includes(q) ? '' : 'none';
    });
  });
}

// Format currency
function fmt(n) {
  return '$' + Number(n).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// Format integer currency
function fmtInt(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

// ===== All Tools Tab + Pagination =====
const ALL_TOOLS = [
  // Auto (25)
  {cat:'auto', name:'Car Insurance Premium Estimator', desc:'Estimate your annual auto insurance premium based on age, vehicle, and driving history.', url:'/tools/auto/car-insurance-premium-estimator.html'},
  {cat:'auto', name:'GAP Insurance Calculator', desc:'Find out if you need GAP insurance and how much it might cost you.', url:'/tools/auto/gap-insurance-calculator.html'},
  {cat:'auto', name:'Auto Deductible Optimizer', desc:'Find the optimal deductible level based on your risk tolerance and driving habits.', url:'/tools/auto/deductible-optimizer.html'},
  {cat:'auto', name:'Bundle Discount Calculator', desc:'See how much you save by bundling home and auto insurance policies.', url:'/tools/auto/bundling-discount-calculator.html'},
  {cat:'auto', name:'Teen Driver Cost Calculator', desc:'Estimate how much adding a teen driver will increase your auto insurance bill.', url:'/tools/auto/teen-driver-cost-calculator.html'},
  {cat:'auto', name:'Car Total Cost of Ownership', desc:'Calculate the true 5-year cost of owning a vehicle including insurance and fuel.', url:'/tools/auto/total-cost-of-ownership-calculator.html'},
  {cat:'auto', name:'Uninsured Motorist Coverage Calculator', desc:'Determine the right uninsured motorist coverage limits for your state.', url:'/tools/auto/uninsured-motorist-coverage-calculator.html'},
  {cat:'auto', name:'Auto Insurance Comparison Tool', desc:'Compare up to 3 auto insurance quotes side by side.', url:'/tools/auto/auto-insurance-comparison-tool.html'},
  {cat:'auto', name:'SR-22 Insurance Cost Calculator', desc:'Estimate SR-22 filing costs and high-risk driver premiums.', url:'/tools/auto/sr22-insurance-cost-calculator.html'},
  {cat:'auto', name:'Classic Car Insurance Calculator', desc:'Estimate agreed value insurance costs for collector and classic cars.', url:'/tools/auto/classic-car-insurance-calculator.html'},
  {cat:'auto', name:'Rideshare Insurance Calculator', desc:'Calculate rideshare insurance costs for Uber and Lyft drivers.', url:'/tools/auto/rideshare-insurance-calculator.html'},
  {cat:'auto', name:'Electric Vehicle Insurance Calculator', desc:'Compare EV vs gas vehicle insurance costs and savings.', url:'/tools/auto/electric-vehicle-insurance-calculator.html'},
  {cat:'auto', name:'Auto Insurance Points Calculator', desc:'See how traffic violations affect your insurance premium points.', url:'/tools/auto/auto-insurance-points-calculator.html'},
  {cat:'auto', name:'Roadside Assistance Value Calculator', desc:'Compare the cost of roadside assistance add-ons vs AAA membership.', url:'/tools/auto/roadside-assistance-value-calculator.html'},
  {cat:'auto', name:'Rental Car Insurance Calculator', desc:'Decide when to buy rental car insurance vs rely on existing coverage.', url:'/tools/auto/rental-car-insurance-calculator.html'},
  {cat:'auto', name:'Pay-Per-Mile Insurance Calculator', desc:'Compare pay-per-mile vs traditional auto insurance based on annual mileage.', url:'/tools/auto/pay-per-mile-insurance-calculator.html'},
  {cat:'auto', name:'Multi-Car Discount Calculator', desc:'Calculate multi-vehicle discounts when insuring 2 or more cars.', url:'/tools/auto/multi-car-discount-calculator.html'},
  {cat:'auto', name:'Liability Only vs Full Coverage Calculator', desc:'Decide between liability-only and full coverage based on vehicle value.', url:'/tools/auto/liability-vs-full-coverage-calculator.html'},
  {cat:'auto', name:'Auto Insurance After DUI Calculator', desc:'Estimate premium increases and timeline after a DUI conviction.', url:'/tools/auto/dui-insurance-cost-calculator.html'},
  {cat:'auto', name:'Accident Forgiveness Value Calculator', desc:'Calculate whether accident forgiveness is worth the premium.', url:'/tools/auto/accident-forgiveness-calculator.html'},
  {cat:'auto', name:'New Car Insurance Calculator', desc:'Estimate first-year insurance costs for a new car purchase.', url:'/tools/auto/new-car-insurance-calculator.html'},
  {cat:'auto', name:'Auto Insurance Claims Impact Calculator', desc:'See how filing a claim affects your auto insurance premium for 3 years.', url:'/tools/auto/auto-insurance-claims-impact-calculator.html'},
  {cat:'auto', name:'Military Auto Insurance Discount Calculator', desc:'Calculate military and veteran auto insurance discounts.', url:'/tools/auto/military-auto-insurance-calculator.html'},
  {cat:'auto', name:'Good Driver Discount Calculator', desc:'Estimate your good driver discount eligibility and savings.', url:'/tools/auto/good-driver-discount-calculator.html'},
  {cat:'auto', name:'Auto Insurance Coverage Recommender', desc:'Answer 5 questions to get a personalized auto coverage recommendation.', url:'/tools/auto/auto-insurance-coverage-recommender.html'},
  // Health (25)
  {cat:'health', name:'ACA Subsidy Calculator 2026', desc:'Calculate your Affordable Care Act health insurance premium tax credit.', url:'/tools/health/aca-subsidy-calculator.html'},
  {cat:'health', name:'HSA Contribution Calculator', desc:'Maximize your Health Savings Account contributions and tax savings for 2026.', url:'/tools/health/hsa-contribution-calculator.html'},
  {cat:'health', name:'COBRA Cost Estimator', desc:'Compare COBRA vs marketplace insurance costs after losing employer coverage.', url:'/tools/health/cobra-cost-estimator.html'},
  {cat:'health', name:'Out-of-Pocket Max Calculator', desc:'Model your annual healthcare costs based on your plan\'s deductible and coinsurance.', url:'/tools/health/out-of-pocket-max-calculator.html'},
  {cat:'health', name:'Health Insurance Deductible Calculator', desc:'Compare deductible levels and find the lowest expected annual healthcare cost.', url:'/tools/health/health-insurance-deductible-calculator.html'},
  {cat:'health', name:'HDHP vs PPO Calculator', desc:'Compare High Deductible Health Plans vs PPO plans based on your usage.', url:'/tools/health/hdhp-vs-ppo-calculator.html'},
  {cat:'health', name:'Medicare Supplement Cost Calculator', desc:'Estimate Medigap supplement plan costs and coverage gaps.', url:'/tools/health/medicare-supplement-cost-calculator.html'},
  {cat:'health', name:'Dental Insurance Value Calculator', desc:'Calculate if dental insurance saves money based on your dental needs.', url:'/tools/health/dental-insurance-value-calculator.html'},
  {cat:'health', name:'Short-Term Health Insurance Calculator', desc:'Estimate short-term health insurance premiums and coverage gaps.', url:'/tools/health/short-term-health-insurance-calculator.html'},
  {cat:'health', name:'Self-Employed Health Insurance Deduction', desc:'Calculate your self-employed health insurance tax deduction.', url:'/tools/health/self-employed-health-insurance-calculator.html'},
  {cat:'health', name:'Health Insurance Affordability Checker', desc:'Check if employer health insurance is considered affordable under ACA rules.', url:'/tools/health/health-insurance-affordability-checker.html'},
  {cat:'health', name:'FSA vs HSA Calculator', desc:'Compare Flexible Spending Accounts vs Health Savings Accounts.', url:'/tools/health/fsa-vs-hsa-calculator.html'},
  {cat:'health', name:'Long-Term Care Insurance Calculator', desc:'Estimate long-term care insurance premiums and coverage needs.', url:'/tools/health/long-term-care-insurance-calculator.html'},
  {cat:'health', name:'Disability Insurance Calculator', desc:'Calculate short and long-term disability insurance coverage needs.', url:'/tools/health/disability-insurance-calculator.html'},
  {cat:'health', name:'Medicare Part B Premium Calculator', desc:'Estimate your Medicare Part B IRMAA surcharge based on income.', url:'/tools/health/medicare-part-b-premium-calculator.html'},
  {cat:'health', name:'Prescription Drug Cost Calculator', desc:'Compare prescription drug costs across insurance plans.', url:'/tools/health/prescription-drug-cost-calculator.html'},
  {cat:'health', name:'Premium Tax Credit 2026', desc:'Calculate your 2026 health insurance premium tax credit amount.', url:'/tools/health/premium-tax-credit-2026.html'},
  {cat:'health', name:'Vision Insurance Value Calculator', desc:'Determine if vision insurance is cost-effective based on your eye care needs.', url:'/tools/health/vision-insurance-value-calculator.html'},
  {cat:'health', name:'Employee Benefits Comparison Tool', desc:'Compare employer health benefit packages side by side.', url:'/tools/health/employee-benefits-comparison-tool.html'},
  {cat:'health', name:'Health Savings Rate Calculator', desc:'Calculate total healthcare spending as a percentage of your income.', url:'/tools/health/health-savings-rate-calculator.html'},
  {cat:'health', name:'COBRA vs Marketplace Calculator', desc:'Compare COBRA continuation vs ACA marketplace plan costs.', url:'/tools/health/cobra-vs-marketplace-calculator.html'},
  {cat:'health', name:'Medicaid Eligibility Estimator', desc:'Check if you or your family may qualify for Medicaid coverage.', url:'/tools/health/medicaid-eligibility-estimator.html'},
  {cat:'health', name:'Health Insurance for Freelancers', desc:'Find the best health insurance option for self-employed freelancers.', url:'/tools/health/freelancer-health-insurance-calculator.html'},
  {cat:'health', name:'Group Health Insurance Cost Estimator', desc:'Estimate employer group health insurance costs per employee.', url:'/tools/health/group-health-insurance-cost-estimator.html'},
  {cat:'health', name:'Annual Physical Savings Calculator', desc:'Calculate how preventive care and annual physicals save on healthcare costs.', url:'/tools/health/annual-physical-savings-calculator.html'},
  // Life (25)
  {cat:'life', name:'Life Insurance Needs Calculator', desc:'Use the DIME method to calculate your total life insurance coverage need.', url:'/tools/life/life-insurance-needs-calculator.html'},
  {cat:'life', name:'Term vs Whole Life Cost Comparison', desc:'Compare monthly premiums and 20-year total costs for term vs whole life.', url:'/tools/life/term-vs-whole-life-calculator.html'},
  {cat:'life', name:'Death Benefit Calculator', desc:'Calculate the right death benefit using present value of future family expenses.', url:'/tools/life/death-benefit-calculator.html'},
  {cat:'life', name:'Mortgage Life Insurance Calculator', desc:'Compare mortgage life insurance vs term life for home loan protection.', url:'/tools/life/life-insurance-for-mortgage.html'},
  {cat:'life', name:'Smoker Life Insurance Calculator', desc:'See how smoking affects your premiums and how much quitting saves.', url:'/tools/life/smoker-life-insurance-calculator.html'},
  {cat:'life', name:'Life Insurance ROI Calculator', desc:'Calculate the return on investment for term and whole life insurance policies.', url:'/tools/life/life-insurance-roi-calculator.html'},
  {cat:'life', name:'Income Replacement Calculator', desc:'Determine how much insurance you need to replace your income until retirement.', url:'/tools/life/income-replacement-calculator.html'},
  {cat:'life', name:'Cash Value Growth Calculator', desc:'Project whole life insurance cash value growth with a year-by-year table.', url:'/tools/life/cash-value-growth-calculator.html'},
  {cat:'life', name:'Policy Loan Calculator', desc:'Calculate life insurance policy loan payments and impact on cash value.', url:'/tools/life/policy-loan-calculator.html'},
  {cat:'life', name:'Life Insurance Affordability Calculator', desc:'Find the maximum coverage you can afford based on your monthly budget.', url:'/tools/life/life-insurance-affordability-calculator.html'},
  {cat:'life', name:'Joint vs Separate Policies Calculator', desc:'Compare joint life insurance vs two individual policies for couples.', url:'/tools/life/joint-life-insurance-calculator.html'},
  {cat:'life', name:'Child Life Insurance Calculator', desc:'Calculate child life insurance costs and the value of locking in low rates.', url:'/tools/life/child-life-insurance-calculator.html'},
  {cat:'life', name:'Final Expense Insurance Calculator', desc:'Estimate final expense insurance costs to cover funeral and end-of-life costs.', url:'/tools/life/final-expense-insurance-calculator.html'},
  {cat:'life', name:'Group vs Individual Life Insurance', desc:'Compare employer group life vs individual policies and find coverage gaps.', url:'/tools/life/group-vs-individual-life-insurance.html'},
  {cat:'life', name:'Beneficiary Needs Assessment', desc:'Calculate personalized coverage needs based on your family\'s financial situation.', url:'/tools/life/beneficiary-needs-assessment.html'},
  {cat:'life', name:'Premium Financing Calculator', desc:'Compare the cost of financing life insurance premiums vs paying directly.', url:'/tools/life/premium-financing-calculator.html'},
  {cat:'life', name:'Survivorship Life Insurance Calculator', desc:'Calculate second-to-die policy costs for estate planning purposes.', url:'/tools/life/survivorship-life-insurance-calculator.html'},
  {cat:'life', name:'Term to Permanent Conversion Calculator', desc:'Estimate costs of converting a term policy to permanent life insurance.', url:'/tools/life/life-insurance-conversion-calculator.html'},
  {cat:'life', name:'Life Settlement vs Surrender Calculator', desc:'Compare life settlement value vs cash surrender value for unwanted policies.', url:'/tools/life/life-insurance-settlement-calculator.html'},
  {cat:'life', name:'Estate Planning Calculator', desc:'Calculate life insurance needed to cover federal and state estate taxes.', url:'/tools/life/estate-planning-life-insurance-calculator.html'},
  {cat:'life', name:'Disability vs Life Insurance Prioritizer', desc:'Find out whether disability or life insurance is your priority.', url:'/tools/life/disability-vs-life-insurance-calculator.html'},
  {cat:'life', name:'Return of Premium Calculator', desc:'Compare standard term vs return-of-premium life insurance costs and ROI.', url:'/tools/life/return-of-premium-calculator.html'},
  {cat:'life', name:'Coverage by Age Calculator', desc:'Get age-appropriate life insurance recommendations with income multipliers.', url:'/tools/life/life-insurance-needs-by-age.html'},
  {cat:'life', name:'No-Medical-Exam Life Insurance Calculator', desc:'Compare no-exam vs traditional life insurance premiums and extra costs.', url:'/tools/life/life-insurance-medical-exam-waiver-calculator.html'},
  {cat:'life', name:'Life Insurance Tax Benefits Calculator', desc:'Quantify life insurance tax advantages: death benefit, cash value, and policy loans.', url:'/tools/life/life-insurance-tax-calculator.html'},
  // Home (25)
  {cat:'home', name:'Homeowners Insurance Estimator', desc:'Estimate your homeowners insurance premium based on home value, location, and age.', url:'/tools/home/home-insurance-estimator.html'},
  {cat:'home', name:'Home Replacement Cost Estimator', desc:'Calculate how much it would cost to rebuild your home from scratch.', url:'/tools/home/replacement-cost-estimator.html'},
  {cat:'home', name:'Flood Insurance Calculator', desc:'Estimate NFIP flood insurance costs based on flood zone and home value.', url:'/tools/home/flood-insurance-calculator.html'},
  {cat:'home', name:'Home + Auto Bundle Savings', desc:'Calculate how much you save by bundling home and auto insurance policies.', url:'/tools/home/bundling-home-auto-calculator.html'},
  {cat:'home', name:'PMI Removal Date Calculator', desc:'Find out when you can eliminate private mortgage insurance from your payment.', url:'/tools/home/pmi-removal-date-calculator.html'},
  {cat:'home', name:'Landlord Insurance Calculator', desc:'Estimate rental property insurance costs including loss-of-rent coverage.', url:'/tools/home/landlord-insurance-calculator.html'},
  {cat:'home', name:'Renters Insurance Calculator', desc:'Calculate renters insurance premiums based on personal property value and location.', url:'/tools/home/renters-insurance-calculator.html'},
  {cat:'home', name:'Personal Property Coverage Calculator', desc:'Add up your belongings to determine the right personal property coverage amount.', url:'/tools/home/personal-property-calculator.html'},
  {cat:'home', name:'Home Insurance Deductible Optimizer', desc:'Compare deductible levels to find the lowest expected annual cost.', url:'/tools/home/home-insurance-deductible-calculator.html'},
  {cat:'home', name:'Umbrella Insurance Calculator', desc:'Calculate how much personal umbrella coverage you need to protect your assets.', url:'/tools/home/umbrella-insurance-calculator.html'},
  {cat:'home', name:'Earthquake Insurance Calculator', desc:'Estimate earthquake insurance costs and determine if coverage is necessary.', url:'/tools/home/earthquake-insurance-calculator.html'},
  {cat:'home', name:'Hurricane Insurance Estimator', desc:'Calculate windstorm and hurricane insurance costs for coastal properties.', url:'/tools/home/hurricane-insurance-calculator.html'},
  {cat:'home', name:'Condo Insurance (HO-6) Calculator', desc:'Estimate HO-6 condo insurance premiums for unit owners.', url:'/tools/home/condo-insurance-calculator.html'},
  {cat:'home', name:'Water Damage Coverage Calculator', desc:'Assess your water damage risk and coverage needs.', url:'/tools/home/water-damage-coverage-calculator.html'},
  {cat:'home', name:'Claims Impact Calculator', desc:'See how filing a home insurance claim affects your premium for 3 years.', url:'/tools/home/home-insurance-claims-impact-calculator.html'},
  {cat:'home', name:'New Home Insurance Estimator', desc:'Estimate first-year homeowners insurance for a new home purchase.', url:'/tools/home/new-home-insurance-calculator.html'},
  {cat:'home', name:'Security System Discount Calculator', desc:'Calculate premium discounts from home security systems and payback period.', url:'/tools/home/home-security-discount-calculator.html'},
  {cat:'home', name:'Insurance-to-Value Ratio Calculator', desc:'Check if your coverage meets the 80% coinsurance requirement.', url:'/tools/home/insurance-to-value-ratio-calculator.html'},
  {cat:'home', name:'Home Warranty vs Insurance Comparison', desc:'Compare home warranty and homeowners insurance costs and coverage.', url:'/tools/home/home-warranty-vs-insurance-calculator.html'},
  {cat:'home', name:'Vacation Home Insurance Calculator', desc:'Estimate insurance costs for second homes and vacation properties.', url:'/tools/home/vacation-home-insurance-calculator.html'},
  {cat:'home', name:'Mobile Home Insurance Calculator', desc:'Calculate manufactured and mobile home insurance premiums.', url:'/tools/home/mobile-home-insurance-calculator.html'},
  {cat:'home', name:'Loss of Use Coverage Calculator', desc:'Determine if your additional living expenses coverage is sufficient.', url:'/tools/home/loss-of-use-coverage-calculator.html'},
  {cat:'home', name:'Home Liability Coverage Calculator', desc:'Calculate the right homeowners liability limit based on your risk profile.', url:'/tools/home/liability-coverage-calculator.html'},
  {cat:'home', name:'Quote Comparison Tool', desc:'Compare up to 3 home insurance quotes side by side to find the best value.', url:'/tools/home/home-insurance-comparison-tool.html'},
  {cat:'home', name:'Wildfire Risk Insurance Calculator', desc:'Estimate home insurance costs in wildfire-prone areas and get prevention tips.', url:'/tools/home/wildfire-risk-insurance-calculator.html'},
  // Business (20)
  {cat:'business', name:'General Liability Calculator', desc:'Estimate GL insurance costs based on business type, revenue, and employee count.', url:'/tools/business/general-liability-calculator.html'},
  {cat:'business', name:'Workers Compensation Calculator', desc:'Calculate workers comp premiums based on payroll, industry class, and state.', url:'/tools/business/workers-comp-calculator.html'},
  {cat:'business', name:'Business Interruption Calculator', desc:'Determine how much business interruption insurance you need to survive a closure.', url:'/tools/business/business-interruption-calculator.html'},
  {cat:'business', name:'Cyber Insurance Calculator', desc:'Estimate cyber liability insurance costs based on industry and data exposure.', url:'/tools/business/cyber-insurance-calculator.html'},
  {cat:'business', name:'Professional Liability (E&O) Calculator', desc:'Calculate E&O insurance costs for consultants, lawyers, accountants, and engineers.', url:'/tools/business/professional-liability-eo-calculator.html'},
  {cat:'business', name:'Business Owner\'s Policy (BOP) Calculator', desc:'Compare BOP bundle vs buying GL and property insurance separately.', url:'/tools/business/bop-business-owners-policy-calculator.html'},
  {cat:'business', name:'Commercial Property Insurance Calculator', desc:'Estimate commercial property insurance for offices, warehouses, and retail stores.', url:'/tools/business/commercial-property-insurance-calculator.html'},
  {cat:'business', name:'Commercial Auto Insurance Calculator', desc:'Calculate fleet vehicle insurance costs based on vehicle type and annual mileage.', url:'/tools/business/commercial-auto-insurance-calculator.html'},
  {cat:'business', name:'D&O Insurance Calculator', desc:'Estimate Directors & Officers liability insurance for private and nonprofit companies.', url:'/tools/business/directors-officers-insurance-calculator.html'},
  {cat:'business', name:'Product Liability Calculator', desc:'Calculate product liability insurance costs based on product type and sales volume.', url:'/tools/business/product-liability-calculator.html'},
  {cat:'business', name:'EPLI Calculator', desc:'Estimate employment practices liability insurance to protect against HR claims.', url:'/tools/business/employment-practices-liability-calculator.html'},
  {cat:'business', name:'Key Person Insurance Calculator', desc:'Calculate key person life insurance coverage needed for critical employees.', url:'/tools/business/key-person-insurance-calculator.html'},
  {cat:'business', name:'Liquor Liability Calculator', desc:'Estimate liquor liability insurance for bars, restaurants, and event venues.', url:'/tools/business/liquor-liability-calculator.html'},
  {cat:'business', name:'Contractor Insurance Calculator', desc:'Calculate GL and workers comp costs for general, electrical, roofing contractors.', url:'/tools/business/contractor-insurance-calculator.html'},
  {cat:'business', name:'Commercial Umbrella Calculator', desc:'Determine commercial umbrella coverage needs and estimate annual premiums.', url:'/tools/business/commercial-umbrella-calculator.html'},
  {cat:'business', name:'Inland Marine (Equipment) Calculator', desc:'Estimate equipment floater insurance costs for tools and business equipment.', url:'/tools/business/inland-marine-insurance-calculator.html'},
  {cat:'business', name:'Surety Bond Cost Calculator', desc:'Calculate surety bond premiums based on bond type and credit score.', url:'/tools/business/surety-bond-calculator.html'},
  {cat:'business', name:'Business Income Insurance Calculator', desc:'Calculate business income coverage based on net income and recovery period.', url:'/tools/business/business-income-insurance-calculator.html'},
  {cat:'business', name:'Restaurant Insurance Calculator', desc:'Get a complete restaurant insurance cost estimate including all required coverages.', url:'/tools/business/restaurant-insurance-calculator.html'},
  {cat:'business', name:'Startup Insurance Calculator', desc:'Answer 5 questions to get a personalized insurance checklist for your startup.', url:'/tools/business/startup-insurance-calculator.html'},
];

(function() {
  const grid = document.getElementById('tools-grid');
  const paginationEl = document.getElementById('pagination');
  if (!grid) return;

  const PER_PAGE = 24;
  let currentCat = 'all';
  let currentPage = 1;

  function filtered() {
    return currentCat === 'all' ? ALL_TOOLS : ALL_TOOLS.filter(t => t.cat === currentCat);
  }

  function renderGrid() {
    const tools = filtered();
    const start = (currentPage - 1) * PER_PAGE;
    const slice = tools.slice(start, start + PER_PAGE);
    grid.innerHTML = slice.map(t =>
      `<a href="${t.url}" class="tool-card"><h3>${t.name}</h3><p>${t.desc}</p></a>`
    ).join('');
  }

  function renderPagination() {
    const total = Math.ceil(filtered().length / PER_PAGE);
    if (total <= 1) { paginationEl.innerHTML = ''; return; }
    let html = '';
    if (currentPage > 1) html += `<button class="page-btn prev-next" data-page="${currentPage-1}">← Prev</button>`;
    for (let i = 1; i <= total; i++) {
      html += `<button class="page-btn${i===currentPage?' active':''}" data-page="${i}">${i}</button>`;
    }
    if (currentPage < total) html += `<button class="page-btn prev-next" data-page="${currentPage+1}">Next →</button>`;
    paginationEl.innerHTML = html;
    paginationEl.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.dataset.page);
        renderGrid();
        renderPagination();
        document.querySelector('.all-tools-section').scrollIntoView({behavior:'smooth', block:'start'});
      });
    });
  }

  function render() { renderGrid(); renderPagination(); }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCat = btn.dataset.cat;
      currentPage = 1;
      render();
    });
  });

  render();
})();
