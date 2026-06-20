const fs=require('fs');
let html=fs.readFileSync('C:/Users/Administrator/coveragefixpro/index.html','utf8');

// ── STEP 3: per-tool emoji 映射 ──
const emojiMap={
  // Auto
  'accident-forgiveness-value-calculator':'🛡️',
  'annual-vs-monthly-payment-calculator':'📅',
  'coverage-gap-analyzer':'🔍',
  'deductible-optimizer':'⚖️',
  'liability-coverage-limits-calculator':'📋',
  'car-insurance-premium-estimator':'💰',
  'insurance-after-accident-calculator':'💥',
  'policy-renewal-savings-calculator':'🔄',
  'total-cost-of-ownership-calculator':'🧮',
  'classic-car-insurance-calculator':'🏎️',
  'collision-coverage-breakeven-calculator':'📊',
  'dui-insurance-rate-calculator':'🚨',
  'electric-vehicle-insurance-calculator':'⚡',
  'comprehensive-vs-liability-calculator':'🆚',
  'gap-insurance-calculator':'📉',
  'good-driver-discount-calculator':'⭐',
  'bundling-discount-calculator':'🏠',
  'insurance-score-estimator':'📈',
  'multi-car-discount-calculator':'🚙',
  'new-car-insurance-cost-calculator':'🚗',
  'mileage-based-insurance-calculator':'📍',
  'rideshare-insurance-cost-calculator':'🚕',
  'sr22-insurance-calculator':'⚠️',
  'teen-driver-cost-calculator':'👦',
  'uninsured-motorist-coverage-calculator':'🚫',
  // Health
  'premium-tax-credit-2026':'💸',
  'aca-subsidy-calculator':'🏛️',
  'catastrophic-plan-eligibility':'🆘',
  'cobra-cost-estimator':'🔗',
  'cobra-vs-marketplace-calculator':'💊',
  'dependent-coverage-calculator':'🏥',
  'employer-benefits-value-calculator':'🩺',
  'fsa-calculator':'💉',
  'health-insurance-affordability-checker':'🩻',
  'deductible-met-tracker':'🧬',
  'out-of-pocket-max-calculator':'💆',
  'health-insurance-penalty-calculator':'🏋️',
  'hmo-vs-ppo-cost-calculator':'📋',
  'hsa-contribution-calculator':'🔬',
  'hsa-growth-calculator':'💵',
  'dental-insurance-worth-it-calculator':'🦷',
  'maternity-insurance-calculator':'🧪',
  'medical-expense-tax-deduction-calculator':'🏃',
  'medicare-part-b-premium-calculator':'🌡️',
  'mental-health-coverage-calculator':'🧠',
  'open-enrollment-calculator':'📊',
  'prescription-drug-cost-calculator':'💊',
  'short-term-health-insurance-calculator':'🛏️',
  'telehealth-savings-calculator':'👁️',
  'vision-insurance-calculator':'👓',
  // Home
  'home-insurance-estimator':'🏠',
  'flood-insurance-calculator':'🌊',
  'earthquake-insurance-calculator':'🌍',
  'renters-insurance-calculator':'🔑',
  'bundling-home-auto-calculator':'🔨',
  'condo-insurance-calculator':'🪟',
  'home-insurance-deductible-calculator':'🏊',
  'home-insurance-comparison-tool':'🌿',
  'home-insurance-claims-impact-calculator':'🏗️',
  'home-security-discount-calculator':'🔒',
  'home-warranty-vs-insurance-calculator':'🌪️',
  'hurricane-insurance-calculator':'☀️',
  'insurance-to-value-ratio-calculator':'🛋️',
  'landlord-insurance-calculator':'📦',
  'liability-coverage-calculator':'🔥',
  'loss-of-use-coverage-calculator':'🌧️',
  'mobile-home-insurance-calculator':'💧',
  'new-home-insurance-calculator':'🔧',
  'personal-property-calculator':'🧰',
  'pmi-removal-date-calculator':'📅',
  'replacement-cost-estimator':'🏚️',
  'umbrella-insurance-calculator':'☂️',
  'vacation-home-insurance-calculator':'🏖️',
  'water-damage-coverage-calculator':'🌊',
  'wildfire-risk-insurance-calculator':'🔥',
  // Life
  'term-vs-whole-life-calculator':'⏳',
  'income-replacement-calculator':'💼',
  'life-insurance-needs-calculator':'👨‍👩‍👧',
  'beneficiary-needs-assessment':'📜',
  'cash-value-growth-calculator':'💰',
  'child-life-insurance-calculator':'👶',
  'death-benefit-calculator':'🛡️',
  'disability-vs-life-insurance-calculator':'🔐',
  'estate-planning-life-insurance-calculator':'🏛️',
  'final-expense-insurance-calculator':'🕊️',
  'group-vs-individual-life-insurance':'👥',
  'joint-life-insurance-calculator':'💑',
  'life-insurance-affordability-calculator':'💳',
  'life-insurance-conversion-calculator':'🔄',
  'life-insurance-for-mortgage':'🏠',
  'life-insurance-medical-exam-waiver-calculator':'🩺',
  'life-insurance-needs-by-age':'🎂',
  'life-insurance-roi-calculator':'📈',
  'life-insurance-settlement-calculator':'⚖️',
  'life-insurance-tax-calculator':'🧾',
  'policy-loan-calculator':'💵',
  'premium-financing-calculator':'🏦',
  'return-of-premium-calculator':'↩️',
  'smoker-life-insurance-calculator':'🌿',
  'survivorship-life-insurance-calculator':'👴',
  // Business
  'general-liability-calculator':'🏢',
  'workers-comp-calculator':'👷',
  'cyber-insurance-calculator':'💻',
  'directors-officers-insurance-calculator':'👔',
  'professional-liability-eo-calculator':'⚖️',
  'restaurant-insurance-calculator':'🍽️',
  'contractor-insurance-calculator':'🔨',
  'bop-business-owners-policy-calculator':'📦',
  'commercial-auto-insurance-calculator':'🚛',
  'commercial-property-insurance-calculator':'🏭',
  'commercial-umbrella-calculator':'🌂',
  'startup-insurance-calculator':'🚀',
  'surety-bond-calculator':'📜',
  'employment-practices-liability-calculator':'👥',
  'inland-marine-insurance-calculator':'⚓',
  'key-person-insurance-calculator':'🗝️',
  'liquor-liability-calculator':'🍺',
  'product-liability-calculator':'🏷️',
  'business-interruption-calculator':'⏸️',
  'business-income-insurance-calculator':'💹',
};

// ── STEP 4: health 描述替换 ──
const healthDesc={
  'premium-tax-credit-2026':'Calculate your 2026 health insurance premium tax credit based on income and household size. See your estimated monthly and annual subsidy instantly.',
  'aca-subsidy-calculator':'Estimate your ACA Marketplace subsidy for 2026 based on income, family size, and location. Find out how much you can save on monthly premiums.',
  'catastrophic-plan-eligibility':'Check if you qualify for a catastrophic health plan and see if the low premiums and high deductible make sense for your situation.',
  'cobra-cost-estimator':'Calculate the true monthly cost of COBRA continuation coverage including the employer contribution you now pay. Compare affordability before your deadline.',
  'cobra-vs-marketplace-calculator':'Compare your COBRA insurance cost against ACA Marketplace alternatives. See which option gives you better coverage for less money.',
  'dependent-coverage-calculator':'Estimate the added monthly cost of adding a spouse, child, or other dependent to your employer health plan. Compare family vs individual-plus-one options.',
  'employer-benefits-value-calculator':'Calculate the full dollar value of your employer-sponsored health benefits including premiums, HSA contributions, and wellness perks.',
  'fsa-calculator':'Calculate how much to contribute to your Flexible Spending Account to maximize tax savings. See your exact take-home pay increase and annual tax benefit.',
  'health-insurance-affordability-checker':'Check whether your health insurance premiums meet the ACA affordability threshold. See if you qualify for subsidies or exemptions based on your income.',
  'deductible-met-tracker':'Track how much of your annual health insurance deductible you have met. See your remaining deductible and estimate when you will hit your out-of-pocket maximum.',
  'out-of-pocket-max-calculator':'Calculate your maximum out-of-pocket health insurance exposure for the year. Understand your worst-case scenario for medical costs under your current plan.',
  'health-insurance-penalty-calculator':'Find out if your state charges a penalty for going uninsured and calculate your estimated fine. See how much the penalty compares to buying coverage.',
  'hmo-vs-ppo-cost-calculator':'Compare the total annual cost of HMO vs PPO health insurance plans. Find out which plan type saves more based on your expected healthcare usage.',
  'hsa-contribution-calculator':'Calculate the maximum 2026 HSA contribution for your plan type and estimate your federal tax savings. See how much you reduce your taxable income.',
  'hsa-growth-calculator':'Project your Health Savings Account balance over 5, 10, or 20 years with investment growth. See how your HSA can become a significant retirement healthcare fund.',
  'dental-insurance-worth-it-calculator':'Calculate whether dental insurance saves you money based on your expected annual dental care. Compare premiums and coverage against your likely out-of-pocket costs.',
  'maternity-insurance-calculator':'Estimate the total cost of pregnancy and childbirth under your health insurance plan. Calculate out-of-pocket costs for prenatal care, delivery, and postpartum visits.',
  'medical-expense-tax-deduction-calculator':'Calculate whether your medical expenses exceed the 7.5% AGI threshold for an IRS tax deduction. See your potential refund from deductible healthcare costs.',
  'medicare-part-b-premium-calculator':'Calculate your 2026 Medicare Part B premium based on your income. See if you owe an IRMAA surcharge and estimate your total annual Medicare costs.',
  'mental-health-coverage-calculator':'Estimate your out-of-pocket cost for therapy and mental health treatment under your current plan. See how many sessions your budget allows per year.',
  'open-enrollment-calculator':'Compare two or three health plans side by side during open enrollment. Calculate total annual costs using your expected medical usage to find the best value.',
  'prescription-drug-cost-calculator':'Estimate your annual prescription drug costs under your health plan\'s formulary tiers. Compare brand, generic, and specialty drug cost-sharing across plan options.',
  'short-term-health-insurance-calculator':'Estimate short-term health insurance premiums for gap coverage between jobs or major life events. Compare costs and coverage limits against ACA plan alternatives.',
  'telehealth-savings-calculator':'Calculate how much you save by choosing telehealth visits over in-person appointments. See your annual savings based on copay differences and avoided travel costs.',
  'vision-insurance-calculator':'Calculate whether vision insurance saves you money based on your expected annual eye care. Compare plan premiums against the cost of glasses, contacts, and exams.',
};

let iconReplaced=0, descReplaced=0;

// 逐个处理工具卡片：按 href 匹配
html=html.replace(/<a href="\/tools\/([a-z]+)\/([^"]+)\.html" class="tool-card">(<span class="tool-card-icon">[^<]*<\/span>)?/g,
  function(match,cat,file,existingSpan){
    const slug=file;
    const emoji=emojiMap[slug];
    const newSpan=emoji?'<span class="tool-card-icon">'+emoji+'</span>':'<span class="tool-card-icon">📋</span>';
    if(emoji) iconReplaced++;
    return '<a href="/tools/'+cat+'/'+file+'.html" class="tool-card">'+newSpan;
  }
);

// health描述替换
html=html.replace(/<a href="\/tools\/health\/([^"]+)\.html" class="tool-card">[\s\S]*?<p>([^<]+)<\/p>/g,
  function(match,file,desc){
    const newDesc=healthDesc[file];
    if(newDesc && (desc.includes('for insurance planning')||desc.includes('Free online'))){
      descReplaced++;
      return match.replace('<p>'+desc+'</p>','<p>'+newDesc+'</p>');
    }
    return match;
  }
);

fs.writeFileSync('C:/Users/Administrator/coveragefixpro/index.html',html,'utf8');
console.log('STEP 3 - emoji替换:',iconReplaced,'个');
console.log('STEP 4 - health描述替换:',descReplaced,'个');
