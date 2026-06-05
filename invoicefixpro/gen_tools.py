import os

tools = [
    ("invoice-generator","Free Invoice Generator","invoice","Create professional invoices instantly. Add line items, taxes, and discounts.","invoice-calculator,freelance-invoice,tax-invoice,quote-generator,receipt-generator"),
    ("pro-forma-invoice","Pro Forma Invoice Generator","invoice","Generate pro forma invoices for goods and services before final billing.","invoice-generator,commercial-invoice,consulting-invoice,tax-invoice,purchase-order"),
    ("commercial-invoice","Commercial Invoice Template","invoice","Create commercial invoices for international trade and shipping.","pro-forma-invoice,invoice-generator,purchase-order,tax-invoice,eu-invoice"),
    ("recurring-invoice","Recurring Invoice Generator","invoice","Set up recurring billing schedules for subscription clients.","invoice-generator,milestone-invoice,payment-agreement,retainer-agreement,net30-invoice"),
    ("blank-invoice","Blank Invoice Template","invoice","A clean blank invoice template you can customize for any business.","invoice-generator,simple-invoice,small-business-invoice,freelance-invoice,sole-trader-invoice"),
    ("simple-invoice","Simple Invoice Generator","invoice","No-frills simple invoice generator for quick billing.","blank-invoice,invoice-generator,freelance-invoice,receipt-generator,cash-receipt"),
    ("tax-invoice","Tax Invoice Generator","invoice","Generate GST/VAT compliant tax invoices with automatic tax calculation.","vat-calculator,gst-calculator,invoice-generator,uk-invoice,australia-invoice"),
    ("freelance-invoice","Freelance Invoice Generator","invoice","Professional invoice template built for freelancers and independent contractors.","contractor-invoice,consulting-invoice,hourly-rate-calculator,payment-reminder,invoice-generator"),
    ("contractor-invoice","Contractor Invoice Generator","invoice","Invoice template for contractors — track labor, materials, and hours.","freelance-invoice,construction-estimate,work-order,hourly-rate-calculator,invoice-generator"),
    ("consulting-invoice","Consulting Invoice Generator","invoice","Bill clients for consulting engagements with hourly or project-based rates.","freelance-invoice,retainer-agreement,hourly-rate-calculator,invoice-generator,milestone-invoice"),
    ("quote-generator","Free Quote Generator","quote","Create professional price quotes and send them to clients instantly.","estimate-generator,service-quote,project-quote,sales-quote,invoice-generator"),
    ("price-quote","Price Quote Template","quote","Generate detailed price quotes with itemized costs and validity dates.","quote-generator,sales-quote,service-quote,estimate-generator,project-cost-calculator"),
    ("sales-quote","Sales Quote Generator","quote","Professional sales quote template with product lines and totals.","price-quote,quote-generator,purchase-order,discount-calculator,invoice-generator"),
    ("service-quote","Service Quote Template","quote","Quote template designed for service-based businesses.","quote-generator,estimate-generator,cleaning-estimate,repair-estimate,service-order"),
    ("project-quote","Project Quote Generator","quote","Detailed project quote with scope, timeline, and cost breakdown.","quote-generator,project-cost-calculator,milestone-invoice,estimate-generator,consulting-invoice"),
    ("estimate-generator","Free Estimate Generator","quote","Create professional estimates for any job or project.","job-estimate,repair-estimate,construction-estimate,quote-generator,project-cost-calculator"),
    ("job-estimate","Job Estimate Template","quote","Estimate template for any type of job — labor and materials included.","estimate-generator,repair-estimate,work-order,hourly-rate-calculator,contractor-invoice"),
    ("repair-estimate","Repair Estimate Generator","quote","Generate itemized repair estimates with parts and labor costs.","job-estimate,estimate-generator,work-order,plumbing-invoice,electrical-invoice"),
    ("construction-estimate","Construction Estimate Template","quote","Detailed construction cost estimate with phases and line items.","estimate-generator,contractor-invoice,work-order,job-estimate,change-order"),
    ("cleaning-estimate","Cleaning Service Estimate","quote","Estimate template for cleaning service businesses.","estimate-generator,cleaning-invoice,service-quote,job-estimate,receipt-generator"),
    ("receipt-generator","Free Receipt Generator","receipt","Generate professional payment receipts for any transaction.","cash-receipt,payment-receipt,sales-receipt,business-receipt,invoice-generator"),
    ("cash-receipt","Cash Receipt Template","receipt","Create cash payment receipts with transaction details.","receipt-generator,payment-receipt,sales-receipt,simple-invoice,business-receipt"),
    ("payment-receipt","Payment Receipt Generator","receipt","Issue payment receipts for invoices and services rendered.","receipt-generator,cash-receipt,business-receipt,payment-history,invoice-generator"),
    ("rent-receipt","Rent Receipt Template","receipt","Landlord rent receipt template with payment period and property details.","receipt-generator,payment-receipt,cash-receipt,payment-history,statement-of-account"),
    ("sales-receipt","Sales Receipt Generator","receipt","Generate sales receipts for product and retail transactions.","receipt-generator,cash-receipt,payment-receipt,business-receipt,sales-tax-calculator"),
    ("donation-receipt","Donation Receipt Template","receipt","Create tax-deductible donation receipts for nonprofits.","receipt-generator,payment-receipt,cash-receipt,tax-invoice,business-receipt"),
    ("hotel-receipt","Hotel Receipt Generator","receipt","Generate hotel stay receipts for business expense reporting.","receipt-generator,expense-receipt,payment-receipt,business-receipt,cash-receipt"),
    ("expense-receipt","Expense Receipt Template","receipt","Track and document business expenses with itemized receipts.","receipt-generator,hotel-receipt,taxi-receipt,business-receipt,payment-receipt"),
    ("business-receipt","Business Receipt Generator","receipt","Professional business receipt for any commercial transaction.","receipt-generator,cash-receipt,sales-receipt,payment-receipt,invoice-generator"),
    ("taxi-receipt","Taxi Receipt Generator","receipt","Create taxi and rideshare receipts for expense claims.","expense-receipt,receipt-generator,hotel-receipt,business-receipt,cash-receipt"),
    ("invoice-calculator","Invoice Total Calculator","calculator","Calculate invoice totals including tax, discounts, and fees automatically.","tax-calculator,discount-calculator,late-fee-calculator,vat-calculator,gst-calculator"),
    ("tax-calculator","Invoice Tax Calculator","calculator","Calculate sales tax, VAT, and GST amounts for invoices.","invoice-calculator,vat-calculator,gst-calculator,sales-tax-calculator,tax-invoice"),
    ("discount-calculator","Discount Calculator","calculator","Calculate discounts and final prices for quotes and invoices.","invoice-calculator,tax-calculator,sales-quote,price-quote,invoice-generator"),
    ("late-fee-calculator","Late Payment Fee Calculator","calculator","Calculate late payment fees and penalties for overdue invoices.","invoice-calculator,overdue-invoice-notice,payment-reminder,final-notice,collection-letter"),
    ("hourly-rate-calculator","Hourly Rate Calculator","calculator","Determine your ideal freelance hourly rate based on income goals.","freelance-rate-calculator,project-cost-calculator,invoice-calculator,freelance-invoice,consulting-invoice"),
    ("project-cost-calculator","Project Cost Calculator","calculator","Estimate total project costs including hours, materials, and overhead.","hourly-rate-calculator,freelance-rate-calculator,estimate-generator,project-quote,invoice-calculator"),
    ("freelance-rate-calculator","Freelance Rate Calculator","calculator","Calculate your minimum viable freelance rate to cover expenses and profit.","hourly-rate-calculator,project-cost-calculator,invoice-calculator,freelance-invoice,consulting-invoice"),
    ("vat-calculator","VAT Calculator","calculator","Calculate VAT amounts for UK and EU invoices quickly.","tax-calculator,gst-calculator,uk-invoice,eu-invoice,tax-invoice"),
    ("gst-calculator","GST Calculator","calculator","Calculate GST for Australian, Canadian, and Indian invoices.","vat-calculator,tax-calculator,australia-invoice,canada-invoice,india-invoice"),
    ("sales-tax-calculator","Sales Tax Calculator","calculator","Calculate US sales tax by state for invoices and receipts.","tax-calculator,vat-calculator,invoice-calculator,sales-receipt,tax-invoice"),
    ("overdue-invoice-notice","Overdue Invoice Notice Generator","payment","Generate professional overdue invoice notices to send to late-paying clients.","payment-reminder,final-notice,collection-letter,late-fee-calculator,invoice-generator"),
    ("payment-reminder","Payment Reminder Letter Generator","payment","Create courteous but firm payment reminder letters for clients.","overdue-invoice-notice,final-notice,collection-letter,payment-plan-agreement,invoice-generator"),
    ("final-notice","Final Payment Notice Generator","payment","Issue a final payment notice before escalating to collections.","overdue-invoice-notice,payment-reminder,collection-letter,late-fee-calculator,payment-plan-agreement"),
    ("collection-letter","Debt Collection Letter Generator","payment","Generate formal debt collection letters for unpaid invoices.","final-notice,overdue-invoice-notice,payment-reminder,payment-plan-agreement,late-fee-calculator"),
    ("payment-plan-agreement","Payment Plan Agreement Generator","payment","Create installment payment plan agreements for outstanding balances.","collection-letter,payment-reminder,payment-agreement,milestone-invoice,deposit-invoice"),
    ("purchase-order","Purchase Order Generator","purchase","Generate professional purchase orders for vendors and suppliers.","blanket-purchase-order,change-order,work-order,service-order,commercial-invoice"),
    ("blanket-purchase-order","Blanket Purchase Order Template","purchase","Create blanket POs for ongoing supplier relationships.","purchase-order,change-order,work-order,service-order,statement-of-account"),
    ("change-order","Change Order Form Generator","purchase","Document scope changes and additional costs with a formal change order.","purchase-order,work-order,construction-estimate,contractor-invoice,project-quote"),
    ("work-order","Work Order Generator","purchase","Create work orders to authorize and track service and repair tasks.","service-order,job-estimate,repair-estimate,contractor-invoice,change-order"),
    ("service-order","Service Order Template","purchase","Service order form for scheduling and authorizing service work.","work-order,service-quote,repair-estimate,cleaning-invoice,plumbing-invoice"),
    ("credit-note","Credit Note Generator","credit","Issue credit notes to clients for returned goods or billing corrections.","debit-note,refund-receipt,credit-memo,invoice-generator,return-merchandise"),
    ("debit-note","Debit Note Generator","credit","Generate debit notes for underbilling corrections and additional charges.","credit-note,credit-memo,invoice-generator,statement-of-account,billing-statement"),
    ("refund-receipt","Refund Receipt Template","credit","Create refund receipts for returned products and cancelled services.","credit-note,credit-memo,return-merchandise,receipt-generator,payment-receipt"),
    ("credit-memo","Credit Memo Generator","credit","Generate credit memos to apply account credits to future invoices.","credit-note,debit-note,refund-receipt,return-merchandise,statement-of-account"),
    ("return-merchandise","Return Merchandise Authorization","credit","Create RMA forms for product returns and exchanges.","credit-note,refund-receipt,credit-memo,purchase-order,business-receipt"),
    ("statement-of-account","Statement of Account Generator","statement","Generate client account statements showing all transactions and balances.","billing-statement,account-summary,payment-history,outstanding-invoices,invoice-generator"),
    ("billing-statement","Billing Statement Template","statement","Monthly billing statement with all charges and payment history.","statement-of-account,account-summary,payment-history,outstanding-invoices,invoice-generator"),
    ("account-summary","Account Summary Generator","statement","Create a clear account summary for client review and reconciliation.","statement-of-account,billing-statement,payment-history,outstanding-invoices,credit-memo"),
    ("payment-history","Payment History Template","statement","Document and present a complete payment history for any account.","statement-of-account,billing-statement,account-summary,outstanding-invoices,payment-receipt"),
    ("outstanding-invoices","Outstanding Invoices Tracker","statement","Track all unpaid and outstanding invoices in one report.","statement-of-account,payment-history,billing-statement,overdue-invoice-notice,invoice-tracker"),
    ("payment-agreement","Payment Agreement Generator","contract","Create formal payment agreements between you and your clients.","payment-plan-agreement,retainer-agreement,milestone-invoice,deposit-invoice,consulting-invoice"),
    ("retainer-agreement","Retainer Agreement Template","contract","Generate retainer agreements for ongoing client relationships.","payment-agreement,consulting-invoice,recurring-invoice,milestone-invoice,freelance-invoice"),
    ("deposit-invoice","Deposit Invoice Generator","contract","Create deposit invoices to collect upfront payments on projects.","milestone-invoice,progress-billing,payment-agreement,invoice-generator,freelance-invoice"),
    ("milestone-invoice","Milestone Invoice Template","contract","Bill clients at project milestones with a structured milestone invoice.","deposit-invoice,progress-billing,project-quote,payment-agreement,consulting-invoice"),
    ("progress-billing","Progress Billing Invoice","contract","Issue invoices as work progresses on long-term projects.","milestone-invoice,deposit-invoice,construction-estimate,contractor-invoice,change-order"),
    ("photography-invoice","Photography Invoice Template","industry","Professional invoice template for photographers — sessions, prints, licenses.","graphic-design-invoice,video-editing-invoice,freelance-invoice,invoice-generator,event-planning-invoice"),
    ("graphic-design-invoice","Graphic Design Invoice","industry","Invoice template for graphic designers covering projects and hourly work.","photography-invoice,web-design-invoice,writing-invoice,freelance-invoice,consulting-invoice"),
    ("web-design-invoice","Web Design Invoice Template","industry","Invoice for web design and development projects with milestone support.","graphic-design-invoice,IT-services-invoice,marketing-invoice,consulting-invoice,invoice-generator"),
    ("marketing-invoice","Marketing Services Invoice","industry","Invoice for marketing campaigns, SEO, ads, and social media services.","web-design-invoice,writing-invoice,consulting-invoice,agency-invoice,invoice-generator"),
    ("writing-invoice","Freelance Writing Invoice","industry","Invoice template for writers covering articles, copywriting, and editing.","graphic-design-invoice,marketing-invoice,freelance-invoice,tutoring-invoice,invoice-generator"),
    ("tutoring-invoice","Tutoring Invoice Template","industry","Invoice for tutors and educators billing for lessons and sessions.","writing-invoice,cleaning-invoice,freelance-invoice,hourly-rate-calculator,simple-invoice"),
    ("cleaning-invoice","Cleaning Services Invoice","industry","Invoice for residential and commercial cleaning services.","cleaning-estimate,plumbing-invoice,landscaping-invoice,service-quote,invoice-generator"),
    ("plumbing-invoice","Plumbing Invoice Template","industry","Invoice for plumbing services with parts and labor breakdown.","electrical-invoice,repair-estimate,work-order,contractor-invoice,invoice-generator"),
    ("electrical-invoice","Electrical Services Invoice","industry","Invoice for electrical contractors covering parts and labor.","plumbing-invoice,repair-estimate,work-order,contractor-invoice,invoice-generator"),
    ("landscaping-invoice","Landscaping Invoice Template","industry","Invoice for landscaping, lawn care, and garden maintenance services.","cleaning-invoice,contractor-invoice,service-quote,estimate-generator,invoice-generator"),
    ("catering-invoice","Catering Invoice Template","industry","Invoice for catering services — events, per-head pricing, and packages.","event-planning-invoice,sales-receipt,invoice-generator,simple-invoice,quote-generator"),
    ("event-planning-invoice","Event Planning Invoice","industry","Invoice template for event planners with deposits and final billing.","catering-invoice,photography-invoice,deposit-invoice,milestone-invoice,invoice-generator"),
    ("IT-services-invoice","IT Services Invoice Template","industry","Invoice for IT support, consulting, and managed services.","web-design-invoice,consulting-invoice,hourly-rate-calculator,retainer-agreement,invoice-generator"),
    ("legal-services-invoice","Legal Services Invoice","industry","Invoice for legal professionals — hourly, flat fee, and retainer billing.","accounting-invoice,consulting-invoice,retainer-agreement,hourly-rate-calculator,invoice-generator"),
    ("accounting-invoice","Accounting Services Invoice","industry","Invoice template for accountants, bookkeepers, and CPAs.","legal-services-invoice,consulting-invoice,retainer-agreement,tax-invoice,invoice-generator"),
    ("invoice-to-pdf","Invoice to PDF Converter","tool","Convert your invoice data to a downloadable PDF in one click.","invoice-generator,invoice-template-word,invoice-template-excel,receipt-generator,quote-generator"),
    ("invoice-number-generator","Invoice Number Generator","tool","Generate sequential invoice numbers and reference codes automatically.","invoice-generator,invoice-tracker,invoice-checklist,net30-invoice,rush-invoice"),
    ("invoice-tracker","Invoice Payment Tracker","tool","Track paid, pending, and overdue invoices in a simple dashboard.","invoice-number-generator,outstanding-invoices,payment-history,overdue-invoice-notice,billing-statement"),
    ("invoice-template-word","Invoice Template for Word","tool","Download a professional invoice template ready for Microsoft Word.","invoice-to-pdf,invoice-template-excel,invoice-generator,blank-invoice,simple-invoice"),
    ("invoice-template-excel","Invoice Template for Excel","tool","Download an invoice template with formulas for Microsoft Excel.","invoice-template-word,invoice-to-pdf,invoice-calculator,blank-invoice,invoice-generator"),
    ("uk-invoice","UK Invoice Template (VAT)","international","VAT-compliant invoice template for UK businesses following HMRC requirements.","vat-calculator,eu-invoice,tax-invoice,invoice-generator,sole-trader-invoice"),
    ("canada-invoice","Canadian Invoice Template (GST)","international","GST/HST compliant invoice template for Canadian businesses.","gst-calculator,australia-invoice,india-invoice,tax-invoice,invoice-generator"),
    ("australia-invoice","Australian Invoice Template (GST)","international","ABN and GST compliant invoice template for Australian businesses.","gst-calculator,canada-invoice,india-invoice,tax-invoice,invoice-generator"),
    ("india-invoice","India GST Invoice Template","international","GST invoice template compliant with Indian tax regulations (CGST/SGST/IGST).","gst-calculator,australia-invoice,canada-invoice,tax-invoice,invoice-generator"),
    ("eu-invoice","EU VAT Invoice Template","international","VAT invoice template compliant with European Union regulations.","vat-calculator,uk-invoice,tax-invoice,invoice-generator,commercial-invoice"),
    ("small-business-invoice","Small Business Invoice Template","business","Simple and professional invoice template for small business owners.","sole-trader-invoice,self-employed-invoice,startup-invoice,agency-invoice,invoice-generator"),
    ("self-employed-invoice","Self-Employed Invoice Template","business","Invoice template for self-employed professionals and sole proprietors.","small-business-invoice,sole-trader-invoice,freelance-invoice,simple-invoice,invoice-generator"),
    ("sole-trader-invoice","Sole Trader Invoice Template","business","Invoice template designed for sole traders with all required fields.","self-employed-invoice,small-business-invoice,uk-invoice,simple-invoice,invoice-generator"),
    ("startup-invoice","Startup Invoice Template","business","Modern invoice template for startups and new businesses.","small-business-invoice,agency-invoice,consulting-invoice,invoice-generator,net30-invoice"),
    ("agency-invoice","Agency Invoice Template","business","Invoice template for creative and marketing agencies.","startup-invoice,marketing-invoice,web-design-invoice,consulting-invoice,invoice-generator"),
    ("invoice-checklist","Invoice Checklist Generator","other","Generate a customized invoice checklist to ensure every invoice is complete.","invoice-generator,invoice-number-generator,invoice-tracker,payment-terms-generator,net30-invoice"),
    ("payment-terms-generator","Payment Terms Generator","other","Create clear payment terms for your invoices and contracts.","invoice-checklist,net30-invoice,net60-invoice,payment-agreement,invoice-generator"),
    ("net30-invoice","Net 30 Invoice Template","other","Invoice template with Net 30 payment terms built in.","net60-invoice,payment-terms-generator,invoice-generator,payment-reminder,overdue-invoice-notice"),
    ("net60-invoice","Net 60 Invoice Template","other","Invoice template with Net 60 payment terms for longer billing cycles.","net30-invoice,payment-terms-generator,invoice-generator,payment-reminder,overdue-invoice-notice"),
    ("rush-invoice","Rush Fee Invoice Template","other","Invoice template for rush jobs with expedite fee line items.","invoice-generator,net30-invoice,freelance-invoice,hourly-rate-calculator,invoice-checklist"),
]

# Category display names
cat_labels = {
    "invoice":"Invoice",
    "quote":"Quote",
    "receipt":"Receipt",
    "calculator":"Calculator",
    "payment":"Payment",
    "purchase":"Purchase Order",
    "credit":"Credit/Debit",
    "statement":"Statement",
    "contract":"Contract",
    "industry":"Industry",
    "tool":"Tool",
    "international":"International",
    "business":"Business",
    "other":"Other",
}

# Tool descriptions for SEO sections
seo_descriptions = {
    "invoice-generator": "Our free invoice generator lets freelancers and small businesses create professional invoices in seconds. Simply enter your business details, client information, and line items — the tool automatically calculates subtotals, taxes, and the total amount due. Download your invoice as a PDF or copy it for use in Word or Excel. No account required. Whether you bill hourly, per project, or by deliverable, InvoiceFixPro's invoice generator adapts to your workflow. Perfect for consultants, designers, developers, photographers, and any independent professional who needs fast, professional billing.",
    "quote-generator": "Generate professional price quotes for any service or product with our free quote builder. Enter your client's details, add line items with quantities and rates, apply discounts and taxes, and produce a polished quote document instantly. Our quote generator is designed for freelancers, contractors, and small businesses who need to win clients with clear, professional proposals. Set quote validity dates, add terms and conditions, and download the finished quote as a PDF. No signup needed.",
    "receipt-generator": "Create professional payment receipts for any transaction with our free receipt generator. Perfect for freelancers, landlords, retailers, and service providers who need to document payments quickly. Enter payer details, payment method, amount, and description — the tool generates a clean receipt you can download or print. Supports cash, bank transfer, credit card, and check payments. Use it for business transactions, rent payments, service fees, or any other payment you need to document.",
    "invoice-calculator": "Calculate invoice totals accurately with our free invoice calculator. Add multiple line items, apply percentage or fixed discounts, set tax rates (sales tax, VAT, or GST), and see the final amount due in real time. Supports multiple tax rates on different line items. Great for double-checking invoices before sending or estimating project costs. Our calculator handles complex invoices with ease, including partial payments, deposits already paid, and late fees.",
    "tax-calculator": "Quickly calculate tax amounts for invoices, quotes, and receipts with our free tax calculator. Enter the pre-tax amount and your applicable tax rate (sales tax, VAT, GST) and instantly see the tax amount and total. Supports reverse tax calculation (find the pre-tax amount from a tax-inclusive total). Useful for freelancers, small business owners, and anyone who needs to verify tax amounts on billing documents.",
    "hourly-rate-calculator": "Determine your ideal freelance hourly rate with our free calculator. Enter your desired annual income, working hours per week, vacation days, and business expenses — the tool calculates the minimum hourly rate you need to charge to meet your goals. Factor in taxes, healthcare, equipment, and overhead. This tool helps new and experienced freelancers set competitive yet sustainable rates. Stop guessing and start pricing with confidence.",
    "late-fee-calculator": "Calculate late payment fees and penalties for overdue invoices. Enter the original invoice amount, the number of days overdue, and your late fee rate (daily, weekly, or monthly percentage) — the tool instantly shows you the accumulated late fee and the new total amount owed. Use this alongside our overdue invoice notice generator to clearly communicate additional charges to clients who pay late.",
    "overdue-invoice-notice": "Generate a professional overdue invoice notice to send to clients who haven't paid on time. Our generator creates a polite but firm payment reminder that includes the original invoice details, amount due, days overdue, and any applicable late fees. Customize the tone from gentle reminder to final warning. Sending a formal notice improves payment rates and sets the stage for further collection action if needed.",
    "payment-reminder": "Create professional payment reminder letters for clients with outstanding invoices. Our generator produces customizable reminder letters at multiple stages — 7-day gentle reminder, 14-day follow-up, and 30-day final notice. Each letter includes invoice reference, amount due, payment instructions, and a polite call to action. Studies show that a well-timed payment reminder can recover over 80% of overdue invoices without damaging client relationships.",
    "purchase-order": "Generate professional purchase orders to send to vendors and suppliers. Our PO generator lets you specify vendor details, shipping address, line items with quantities and unit prices, and delivery terms. Each purchase order includes a unique PO number, issue date, and authorization signature block. Download as PDF or copy the text. Use purchase orders to formalize procurement, track spending, and ensure vendors deliver exactly what you ordered.",
    "credit-note": "Issue professional credit notes to clients for returned goods, billing errors, or service credits. Our credit note generator creates a properly formatted document referencing the original invoice, detailing the reason for the credit, and showing the credit amount. Credit notes are essential for accurate bookkeeping and maintaining good client relationships when corrections or refunds are needed.",
    "statement-of-account": "Generate a comprehensive statement of account for any client. This tool compiles all invoices, payments, credits, and outstanding balances into a clear statement document. Send monthly statements to clients to improve payment rates and reduce billing disputes. Includes invoice dates, reference numbers, amounts, payment dates, and current balance. Ideal for businesses with ongoing client relationships and recurring billing.",
    "photography-invoice": "Professional invoice template built specifically for photographers. Bill for photography sessions, event coverage, photo editing, print orders, and licensing fees. Includes fields for session type, hours, deliverables, travel expenses, and rush fees. Our photography invoice template helps you get paid faster with clear, professional billing that reflects your creative expertise. Works for portrait photographers, wedding photographers, commercial photographers, and videographers.",
    "web-design-invoice": "Invoice template designed for web designers and developers. Bill for design mockups, development hours, domain and hosting setup, content management, SEO, and ongoing maintenance. Support milestone-based or hourly billing. Includes fields for project name, deliverables, revision rounds, and payment terms. Our web design invoice template helps you maintain professional client relationships and ensure you get paid for every hour and deliverable.",
}

def get_seo_text(slug, title):
    if slug in seo_descriptions:
        return seo_descriptions[slug]
    return f"Use our free {title} tool to create professional billing documents in seconds. No registration required — simply fill in your details and generate a professional document instantly. InvoiceFixPro provides freelancers and small businesses with the tools they need to bill professionally, get paid faster, and maintain accurate financial records. Our {title} tool is designed to be simple, fast, and completely free. Download your document as a PDF, copy the text, or print directly from your browser. Join thousands of freelancers and small business owners who rely on InvoiceFixPro for their billing needs."

def get_related_links(related_str):
    links = []
    for slug in related_str.split(",")[:5]:
        slug = slug.strip()
        match = next((t for t in tools if t[0]==slug), None)
        if match:
            links.append((slug, match[1]))
    return links

def build_tool_js(slug, title):
    if "calculator" in slug or slug in ["vat-calculator","gst-calculator","sales-tax-calculator","discount-calculator","late-fee-calculator","hourly-rate-calculator","project-cost-calculator","freelance-rate-calculator"]:
        return build_calculator_js(slug, title)
    elif "receipt" in slug:
        return build_receipt_js(slug, title)
    elif "estimate" in slug or "quote" in slug:
        return build_quote_js(slug, title)
    elif "reminder" in slug or "notice" in slug or "letter" in slug or "collection" in slug:
        return build_letter_js(slug, title)
    else:
        return build_invoice_js(slug, title)

def build_invoice_js(slug, title):
    return """
function addRow(){
  const tb=document.getElementById('lineItems');
  const tr=document.createElement('tr');
  tr.innerHTML=`<td><input type="text" placeholder="Item description" style="width:100%;padding:6px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px"></td>
    <td><input type="number" value="1" min="0" oninput="calcTotals()" style="width:60px;padding:6px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px"></td>
    <td><input type="number" value="0" min="0" step="0.01" oninput="calcTotals()" style="width:90px;padding:6px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px"></td>
    <td id="rt" style="text-align:right;padding:6px;font-size:13px">$0.00</td>
    <td><button onclick="this.closest('tr').remove();calcTotals()" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;padding:4px 8px;cursor:pointer">✕</button></td>`;
  tb.appendChild(tr);
  calcTotals();
}
function calcTotals(){
  let sub=0;
  document.querySelectorAll('#lineItems tr').forEach(tr=>{
    const inputs=tr.querySelectorAll('input');
    if(inputs.length<3)return;
    const qty=parseFloat(inputs[1].value)||0;
    const rate=parseFloat(inputs[2].value)||0;
    const tot=qty*rate;
    const td=tr.querySelector('#rt')||tr.cells[3];
    if(td)td.textContent='$'+tot.toFixed(2);
    sub+=tot;
  });
  const disc=(parseFloat(document.getElementById('discount').value)||0)/100;
  const tax=(parseFloat(document.getElementById('taxRate').value)||0)/100;
  const discAmt=sub*disc;
  const taxAmt=(sub-discAmt)*tax;
  const total=sub-discAmt+taxAmt;
  document.getElementById('subtotal').textContent='$'+sub.toFixed(2);
  document.getElementById('discountAmt').textContent='-$'+discAmt.toFixed(2);
  document.getElementById('taxAmt').textContent='$'+taxAmt.toFixed(2);
  document.getElementById('totalAmt').textContent='$'+total.toFixed(2);
}
function generateInvoice(){
  const from=document.getElementById('from').value||'Your Business';
  const to=document.getElementById('to').value||'Client Name';
  const invNum=document.getElementById('invNum').value||'INV-001';
  const date=document.getElementById('invDate').value||new Date().toISOString().split('T')[0];
  const due=document.getElementById('dueDate').value||'';
  let lines='';
  document.querySelectorAll('#lineItems tr').forEach(tr=>{
    const inputs=tr.querySelectorAll('input');
    if(inputs.length<3)return;
    const desc=inputs[0].value||'Item';
    const qty=parseFloat(inputs[1].value)||0;
    const rate=parseFloat(inputs[2].value)||0;
    lines+=desc.padEnd(30)+' x'+qty+'  $'+rate.toFixed(2)+'  $'+(qty*rate).toFixed(2)+'\\n';
  });
  const out=document.getElementById('output');
  out.style.display='block';
  document.getElementById('preview').textContent=
`INVOICE
${'='.repeat(50)}
From: ${from}
To:   ${to}

Invoice #: ${invNum}
Date:      ${date}${due?'\\nDue:       '+due:''}

${'─'.repeat(50)}
DESCRIPTION                    QTY   RATE    AMOUNT
${'─'.repeat(50)}
${lines}${'─'.repeat(50)}
Subtotal:  ${document.getElementById('subtotal').textContent}
Discount:  ${document.getElementById('discountAmt').textContent}
Tax:       ${document.getElementById('taxAmt').textContent}
${'─'.repeat(50)}
TOTAL DUE: ${document.getElementById('totalAmt').textContent}
${'='.repeat(50)}
${document.getElementById('notes').value?'Notes: '+document.getElementById('notes').value:''}`;
}
function copyText(){
  navigator.clipboard.writeText(document.getElementById('preview').textContent);
  const b=document.getElementById('copyBtn');b.textContent='Copied!';setTimeout(()=>b.textContent='Copy',2000);
}
function printDoc(){window.print()}
window.onload=()=>{addRow();calcTotals()};
"""

def build_calculator_js(slug, title):
    if slug=="hourly-rate-calculator":
        return """
function calc(){
  const income=parseFloat(document.getElementById('income').value)||0;
  const weeks=parseFloat(document.getElementById('weeks').value)||48;
  const hrs=parseFloat(document.getElementById('hrs').value)||40;
  const expenses=parseFloat(document.getElementById('expenses').value)||0;
  const tax=(parseFloat(document.getElementById('tax').value)||25)/100;
  const billable=weeks*hrs*0.75;
  const grossNeeded=(income+expenses)/(1-tax);
  const rate=billable>0?grossNeeded/billable:0;
  document.getElementById('result').style.display='block';
  document.getElementById('minRate').textContent='$'+rate.toFixed(2)+'/hr';
  document.getElementById('billableHrs').textContent=Math.round(billable)+' hrs/yr';
  document.getElementById('grossNeeded').textContent='$'+grossNeeded.toFixed(0)+'/yr';
}
"""
    elif slug=="late-fee-calculator":
        return """
function calc(){
  const amt=parseFloat(document.getElementById('amount').value)||0;
  const days=parseFloat(document.getElementById('days').value)||0;
  const rate=(parseFloat(document.getElementById('rate').value)||1.5)/100;
  const period=document.getElementById('period').value;
  let multiplier=days;
  if(period==='weekly')multiplier=days/7;
  if(period==='monthly')multiplier=days/30;
  const fee=amt*rate*multiplier;
  const total=amt+fee;
  document.getElementById('result').style.display='block';
  document.getElementById('feeAmt').textContent='$'+fee.toFixed(2);
  document.getElementById('totalAmt').textContent='$'+total.toFixed(2);
}
"""
    elif slug in ["vat-calculator","gst-calculator","sales-tax-calculator","tax-calculator"]:
        return """
function calc(){
  const amt=parseFloat(document.getElementById('amount').value)||0;
  const rate=(parseFloat(document.getElementById('rate').value)||0)/100;
  const mode=document.getElementById('mode').value;
  let pre,tax,total;
  if(mode==='add'){pre=amt;tax=amt*rate;total=amt+tax;}
  else{total=amt;pre=amt/(1+rate);tax=total-pre;}
  document.getElementById('result').style.display='block';
  document.getElementById('preAmt').textContent='$'+pre.toFixed(2);
  document.getElementById('taxAmt').textContent='$'+tax.toFixed(2);
  document.getElementById('totalAmt').textContent='$'+total.toFixed(2);
}
"""
    elif slug=="discount-calculator":
        return """
function calc(){
  const orig=parseFloat(document.getElementById('original').value)||0;
  const disc=parseFloat(document.getElementById('discount').value)||0;
  const discAmt=orig*(disc/100);
  const final=orig-discAmt;
  document.getElementById('result').style.display='block';
  document.getElementById('discAmt').textContent='$'+discAmt.toFixed(2);
  document.getElementById('finalAmt').textContent='$'+final.toFixed(2);
  document.getElementById('savings').textContent=disc.toFixed(1)+'%';
}
"""
    else:
        return """
function calc(){
  let sub=0;
  document.querySelectorAll('.li-row').forEach(row=>{
    const qty=parseFloat(row.querySelector('.qty').value)||0;
    const rate=parseFloat(row.querySelector('.rate').value)||0;
    sub+=qty*rate;
  });
  const disc=(parseFloat(document.getElementById('discount').value)||0)/100;
  const tax=(parseFloat(document.getElementById('taxRate').value)||0)/100;
  const discAmt=sub*disc;
  const taxAmt=(sub-discAmt)*tax;
  const total=sub-discAmt+taxAmt;
  document.getElementById('result').style.display='block';
  document.getElementById('sub').textContent='$'+sub.toFixed(2);
  document.getElementById('discAmt').textContent='$'+discAmt.toFixed(2);
  document.getElementById('taxAmt').textContent='$'+taxAmt.toFixed(2);
  document.getElementById('total').textContent='$'+total.toFixed(2);
}
function addRow(){
  const d=document.getElementById('lines');
  const r=document.createElement('div');r.className='li-row';r.style='display:flex;gap:8px;margin-bottom:8px';
  r.innerHTML='<input class="qty" type="number" value="1" min="0" placeholder="Qty" style="width:70px;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px"><input class="rate" type="number" value="0" step="0.01" placeholder="Rate" oninput="calc()" style="width:120px;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px"><button onclick="this.parentElement.remove();calc()" style="padding:8px 12px;background:#fee2e2;color:#dc2626;border:none;border-radius:6px;cursor:pointer">✕</button>';
  d.appendChild(r);
}
window.onload=addRow;
"""

def build_receipt_js(slug, title):
    return """
function generateReceipt(){
  const from=document.getElementById('from').value||'Business Name';
  const to=document.getElementById('to').value||'Customer Name';
  const amt=document.getElementById('amount').value||'0.00';
  const method=document.getElementById('method').value||'Cash';
  const date=document.getElementById('rdate').value||new Date().toISOString().split('T')[0];
  const ref=document.getElementById('ref').value||'REC-001';
  const desc=document.getElementById('desc').value||'Payment received';
  document.getElementById('output').style.display='block';
  document.getElementById('preview').textContent=
`RECEIPT
${'='.repeat(45)}
Receipt #: ${ref}
Date:      ${date}
${'─'.repeat(45)}
Received from: ${to}
Received by:   ${from}
${'─'.repeat(45)}
Description: ${desc}
Payment method: ${method}
${'─'.repeat(45)}
AMOUNT PAID: $${parseFloat(amt).toFixed(2)}
${'='.repeat(45)}
Thank you for your payment!`;
}
function copyText(){
  navigator.clipboard.writeText(document.getElementById('preview').textContent);
  const b=document.getElementById('copyBtn');b.textContent='Copied!';setTimeout(()=>b.textContent='Copy',2000);
}
"""

def build_quote_js(slug, title):
    return """
function addRow(){
  const tb=document.getElementById('lineItems');
  const tr=document.createElement('tr');
  tr.innerHTML=`<td><input type="text" placeholder="Description" style="width:100%;padding:6px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px"></td>
    <td><input type="number" value="1" min="0" oninput="calcTotals()" style="width:60px;padding:6px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px"></td>
    <td><input type="number" value="0" min="0" step="0.01" oninput="calcTotals()" style="width:90px;padding:6px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px"></td>
    <td id="rt" style="text-align:right;padding:6px;font-size:13px">$0.00</td>
    <td><button onclick="this.closest('tr').remove();calcTotals()" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;padding:4px 8px;cursor:pointer">✕</button></td>`;
  tb.appendChild(tr);calcTotals();
}
function calcTotals(){
  let sub=0;
  document.querySelectorAll('#lineItems tr').forEach(tr=>{
    const inputs=tr.querySelectorAll('input');if(inputs.length<3)return;
    const tot=(parseFloat(inputs[1].value)||0)*(parseFloat(inputs[2].value)||0);
    const td=tr.querySelector('#rt')||tr.cells[3];if(td)td.textContent='$'+tot.toFixed(2);
    sub+=tot;
  });
  const tax=(parseFloat(document.getElementById('taxRate').value)||0)/100;
  const taxAmt=sub*tax;
  document.getElementById('subtotal').textContent='$'+sub.toFixed(2);
  document.getElementById('taxAmt').textContent='$'+taxAmt.toFixed(2);
  document.getElementById('totalAmt').textContent='$'+(sub+taxAmt).toFixed(2);
}
function generateQuote(){
  const from=document.getElementById('from').value||'Your Business';
  const to=document.getElementById('to').value||'Client Name';
  const qNum=document.getElementById('qNum').value||'Q-001';
  const date=document.getElementById('qDate').value||new Date().toISOString().split('T')[0];
  const valid=document.getElementById('valid').value||'30';
  let lines='';
  document.querySelectorAll('#lineItems tr').forEach(tr=>{
    const inputs=tr.querySelectorAll('input');if(inputs.length<3)return;
    const desc=inputs[0].value||'Item';
    const qty=parseFloat(inputs[1].value)||0;const rate=parseFloat(inputs[2].value)||0;
    lines+=desc.padEnd(28)+' x'+qty+'  $'+rate.toFixed(2)+'  $'+(qty*rate).toFixed(2)+'\\n';
  });
  document.getElementById('output').style.display='block';
  document.getElementById('preview').textContent=
`QUOTE / ESTIMATE
${'='.repeat(50)}
From: ${from}
To:   ${to}
Quote #: ${qNum}   Date: ${date}   Valid: ${valid} days
${'─'.repeat(50)}
DESCRIPTION                  QTY   RATE    AMOUNT
${'─'.repeat(50)}
${lines}${'─'.repeat(50)}
Subtotal: ${document.getElementById('subtotal').textContent}
Tax:      ${document.getElementById('taxAmt').textContent}
${'─'.repeat(50)}
TOTAL:    ${document.getElementById('totalAmt').textContent}
${'='.repeat(50)}`;
}
function copyText(){
  navigator.clipboard.writeText(document.getElementById('preview').textContent);
  const b=document.getElementById('copyBtn');b.textContent='Copied!';setTimeout(()=>b.textContent='Copy',2000);
}
window.onload=()=>{addRow();calcTotals()};
"""

def build_letter_js(slug, title):
    return """
function generate(){
  const from=document.getElementById('from').value||'Your Business';
  const to=document.getElementById('to').value||'Client Name';
  const invNum=document.getElementById('invNum').value||'INV-001';
  const amount=document.getElementById('amount').value||'0.00';
  const days=document.getElementById('days').value||'30';
  const date=new Date().toISOString().split('T')[0];
  document.getElementById('output').style.display='block';
  document.getElementById('preview').textContent=
`${date}

${to}

RE: Outstanding Invoice ${invNum} — Amount Due: $${parseFloat(amount).toFixed(2)}

Dear ${to},

This is a reminder that invoice ${invNum} for $${parseFloat(amount).toFixed(2)} is now ${days} days past due.

Please arrange payment at your earliest convenience. If you have already sent payment, please disregard this notice.

If you have any questions regarding this invoice, please contact us immediately.

Payment details:
Invoice #: ${invNum}
Amount Due: $${parseFloat(amount).toFixed(2)}
Days Overdue: ${days}

Thank you for your prompt attention to this matter.

Sincerely,
${from}`;
}
function copyText(){
  navigator.clipboard.writeText(document.getElementById('preview').textContent);
  const b=document.getElementById('copyBtn');b.textContent='Copied!';setTimeout(()=>b.textContent='Copy',2000);
}
"""

def get_form_html(slug, title):
    is_calc = "calculator" in slug
    is_receipt = "receipt" in slug
    is_quote = "estimate" in slug or "quote" in slug
    is_letter = any(x in slug for x in ["reminder","notice","letter","collection","final-notice"])

    if is_calc:
        if slug == "hourly-rate-calculator":
            return """
<div class="form-card">
  <h2>Enter Your Details</h2>
  <div class="form-grid">
    <div class="field"><label>Desired Annual Income ($)</label><input id="income" type="number" value="60000" placeholder="60000"></div>
    <div class="field"><label>Working Weeks per Year</label><input id="weeks" type="number" value="48" placeholder="48"></div>
    <div class="field"><label>Hours per Week</label><input id="hrs" type="number" value="40" placeholder="40"></div>
    <div class="field"><label>Annual Business Expenses ($)</label><input id="expenses" type="number" value="5000" placeholder="5000"></div>
    <div class="field"><label>Estimated Tax Rate (%)</label><input id="tax" type="number" value="25" placeholder="25"></div>
  </div>
  <button class="btn-primary" onclick="calc()">Calculate My Rate</button>
</div>
<div id="result" class="preview-card" style="display:none">
  <h2>Your Recommended Rate</h2>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;text-align:center">
    <div><div style="font-size:2rem;font-weight:800;color:var(--primary)" id="minRate">-</div><div style="font-size:13px;color:var(--text2)">Minimum Hourly Rate</div></div>
    <div><div style="font-size:2rem;font-weight:800;color:var(--text)" id="billableHrs">-</div><div style="font-size:13px;color:var(--text2)">Billable Hours/Year</div></div>
    <div><div style="font-size:2rem;font-weight:800;color:var(--text)" id="grossNeeded">-</div><div style="font-size:13px;color:var(--text2)">Gross Revenue Needed</div></div>
  </div>
</div>"""
        elif slug == "late-fee-calculator":
            return """
<div class="form-card">
  <h2>Calculate Late Fee</h2>
  <div class="form-grid">
    <div class="field"><label>Original Invoice Amount ($)</label><input id="amount" type="number" value="1000" step="0.01"></div>
    <div class="field"><label>Days Overdue</label><input id="days" type="number" value="30"></div>
    <div class="field"><label>Late Fee Rate (%)</label><input id="rate" type="number" value="1.5" step="0.1"></div>
    <div class="field"><label>Fee Period</label><select id="period"><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="daily">Daily</option></select></div>
  </div>
  <button class="btn-primary" onclick="calc()">Calculate Late Fee</button>
</div>
<div id="result" class="preview-card" style="display:none">
  <h2>Late Fee Result</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;text-align:center">
    <div><div style="font-size:2rem;font-weight:800;color:#dc2626" id="feeAmt">-</div><div style="font-size:13px;color:var(--text2)">Late Fee</div></div>
    <div><div style="font-size:2rem;font-weight:800;color:var(--primary)" id="totalAmt">-</div><div style="font-size:13px;color:var(--text2)">New Total Due</div></div>
  </div>
</div>"""
        elif slug in ["vat-calculator","gst-calculator","sales-tax-calculator","tax-calculator"]:
            label = "VAT" if "vat" in slug else "GST" if "gst" in slug else "Tax"
            default_rate = "20" if "vat" in slug else "10" if "gst" in slug else "8.875"
            return f"""
<div class="form-card">
  <h2>Calculate {label}</h2>
  <div class="form-grid">
    <div class="field"><label>Amount ($)</label><input id="amount" type="number" value="1000" step="0.01"></div>
    <div class="field"><label>{label} Rate (%)</label><input id="rate" type="number" value="{default_rate}" step="0.001"></div>
    <div class="field full"><label>Calculation Mode</label><select id="mode"><option value="add">Add {label} to amount</option><option value="remove">Extract {label} from total</option></select></div>
  </div>
  <button class="btn-primary" onclick="calc()">Calculate {label}</button>
</div>
<div id="result" class="preview-card" style="display:none">
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;text-align:center">
    <div><div style="font-size:1.8rem;font-weight:800;color:var(--text2)" id="preAmt">-</div><div style="font-size:13px;color:var(--text2)">Pre-Tax Amount</div></div>
    <div><div style="font-size:1.8rem;font-weight:800;color:#dc2626" id="taxAmt">-</div><div style="font-size:13px;color:var(--text2)">{label} Amount</div></div>
    <div><div style="font-size:1.8rem;font-weight:800;color:var(--primary)" id="totalAmt">-</div><div style="font-size:13px;color:var(--text2)">Total Amount</div></div>
  </div>
</div>"""
        elif slug == "discount-calculator":
            return """
<div class="form-card">
  <h2>Calculate Discount</h2>
  <div class="form-grid">
    <div class="field"><label>Original Price ($)</label><input id="original" type="number" value="1000" step="0.01"></div>
    <div class="field"><label>Discount (%)</label><input id="discount" type="number" value="10" step="0.1"></div>
  </div>
  <button class="btn-primary" onclick="calc()">Calculate</button>
</div>
<div id="result" class="preview-card" style="display:none">
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;text-align:center">
    <div><div style="font-size:1.8rem;font-weight:800;color:#dc2626" id="discAmt">-</div><div style="font-size:13px;color:var(--text2)">Discount Amount</div></div>
    <div><div style="font-size:1.8rem;font-weight:800;color:var(--primary)" id="finalAmt">-</div><div style="font-size:13px;color:var(--text2)">Final Price</div></div>
    <div><div style="font-size:1.8rem;font-weight:800;color:var(--text2)" id="savings">-</div><div style="font-size:13px;color:var(--text2)">You Save</div></div>
  </div>
</div>"""
        else:
            return """
<div class="form-card">
  <h2>Add Line Items</h2>
  <div id="lines"></div>
  <button onclick="addRow()" style="margin-bottom:16px;padding:8px 16px;background:var(--primary-light);color:var(--primary);border:1.5px solid var(--primary);border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer">+ Add Item</button>
  <div class="form-grid">
    <div class="field"><label>Discount (%)</label><input id="discount" type="number" value="0" step="0.1" oninput="calc()"></div>
    <div class="field"><label>Tax Rate (%)</label><input id="taxRate" type="number" value="0" step="0.1" oninput="calc()"></div>
  </div>
  <button class="btn-primary" onclick="calc()">Calculate Total</button>
</div>
<div id="result" class="preview-card" style="display:none">
  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;text-align:center">
    <div><div style="font-size:1.5rem;font-weight:700;color:var(--text2)" id="sub">-</div><div style="font-size:13px;color:var(--text2)">Subtotal</div></div>
    <div><div style="font-size:1.5rem;font-weight:700;color:#dc2626" id="discAmt">-</div><div style="font-size:13px;color:var(--text2)">Discount</div></div>
    <div><div style="font-size:1.5rem;font-weight:700;color:var(--text2)" id="taxAmt">-</div><div style="font-size:13px;color:var(--text2)">Tax</div></div>
    <div><div style="font-size:2rem;font-weight:800;color:var(--primary)" id="total">-</div><div style="font-size:13px;color:var(--text2)">Total</div></div>
  </div>
</div>"""

    if is_receipt:
        return """
<div class="form-card">
  <h2>Receipt Details</h2>
  <div class="form-grid">
    <div class="field"><label>Business / Received By</label><input id="from" type="text" placeholder="Your Business Name"></div>
    <div class="field"><label>Customer / Payer</label><input id="to" type="text" placeholder="Customer Name"></div>
    <div class="field"><label>Receipt #</label><input id="ref" type="text" placeholder="REC-001" value="REC-001"></div>
    <div class="field"><label>Date</label><input id="rdate" type="date"></div>
    <div class="field"><label>Amount ($)</label><input id="amount" type="number" placeholder="0.00" step="0.01"></div>
    <div class="field"><label>Payment Method</label><select id="method"><option>Cash</option><option>Bank Transfer</option><option>Credit Card</option><option>Check</option><option>PayPal</option></select></div>
    <div class="field full"><label>Description</label><textarea id="desc" placeholder="What is this payment for?"></textarea></div>
  </div>
  <button class="btn-primary" onclick="generateReceipt()">Generate Receipt</button>
</div>
<div id="output" class="preview-card" style="display:none">
  <h2>Receipt Preview</h2>
  <pre id="preview" style="font-family:monospace;font-size:13px;line-height:1.8;white-space:pre-wrap"></pre>
  <div class="download-row">
    <button id="copyBtn" class="btn-dl btn-dl-doc" onclick="copyText()">Copy Text</button>
    <button class="btn-dl btn-dl-pdf" onclick="printDoc()">Print / Save PDF</button>
  </div>
</div>"""

    if is_letter:
        return """
<div class="form-card">
  <h2>Letter Details</h2>
  <div class="form-grid">
    <div class="field"><label>Your Business Name</label><input id="from" type="text" placeholder="Your Business"></div>
    <div class="field"><label>Client Name</label><input id="to" type="text" placeholder="Client Name"></div>
    <div class="field"><label>Invoice Number</label><input id="invNum" type="text" placeholder="INV-001" value="INV-001"></div>
    <div class="field"><label>Amount Due ($)</label><input id="amount" type="number" placeholder="0.00" step="0.01"></div>
    <div class="field"><label>Days Overdue</label><input id="days" type="number" placeholder="30" value="30"></div>
  </div>
  <button class="btn-primary" onclick="generate()">Generate Letter</button>
</div>
<div id="output" class="preview-card" style="display:none">
  <h2>Letter Preview</h2>
  <pre id="preview" style="font-family:monospace;font-size:13px;line-height:1.8;white-space:pre-wrap"></pre>
  <div class="download-row">
    <button id="copyBtn" class="btn-dl btn-dl-doc" onclick="copyText()">Copy Text</button>
    <button class="btn-dl btn-dl-pdf" onclick="printDoc?printDoc():window.print()">Print / Save PDF</button>
  </div>
</div>"""

    if is_quote:
        return """
<div class="form-card">
  <h2>Quote Details</h2>
  <div class="form-grid">
    <div class="field"><label>Your Business</label><input id="from" type="text" placeholder="Your Business Name"></div>
    <div class="field"><label>Client Name</label><input id="to" type="text" placeholder="Client / Company"></div>
    <div class="field"><label>Quote #</label><input id="qNum" type="text" placeholder="Q-001" value="Q-001"></div>
    <div class="field"><label>Date</label><input id="qDate" type="date"></div>
    <div class="field"><label>Valid for (days)</label><input id="valid" type="number" value="30"></div>
    <div class="field"><label>Tax Rate (%)</label><input id="taxRate" type="number" value="0" step="0.1" oninput="calcTotals()"></div>
  </div>
</div>
<div class="form-card">
  <h2>Line Items</h2>
  <table style="width:100%;border-collapse:collapse">
    <thead><tr style="font-size:12px;color:var(--text2);text-align:left"><th style="padding:6px">Description</th><th style="padding:6px">Qty</th><th style="padding:6px">Rate</th><th style="padding:6px;text-align:right">Total</th><th></th></tr></thead>
    <tbody id="lineItems"></tbody>
  </table>
  <button onclick="addRow()" style="margin-top:12px;padding:8px 16px;background:var(--primary-light);color:var(--primary);border:1.5px solid var(--primary);border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer">+ Add Item</button>
  <div style="margin-top:20px;text-align:right;font-size:14px;line-height:2">
    <div>Subtotal: <strong id="subtotal">$0.00</strong></div>
    <div>Tax: <strong id="taxAmt">$0.00</strong></div>
    <div style="font-size:16px;font-weight:800;color:var(--primary)">Total: <strong id="totalAmt">$0.00</strong></div>
  </div>
  <button class="btn-primary" onclick="generateQuote()">Generate Quote</button>
</div>
<div id="output" class="preview-card" style="display:none">
  <h2>Quote Preview</h2>
  <pre id="preview" style="font-family:monospace;font-size:13px;line-height:1.8;white-space:pre-wrap"></pre>
  <div class="download-row">
    <button id="copyBtn" class="btn-dl btn-dl-doc" onclick="copyText()">Copy Text</button>
    <button class="btn-dl btn-dl-pdf" onclick="window.print()">Print / Save PDF</button>
  </div>
</div>"""

    # Default: invoice form
    return """
<div class="form-card">
  <h2>Invoice Details</h2>
  <div class="form-grid">
    <div class="field"><label>From (Your Business)</label><input id="from" type="text" placeholder="Your Name / Business"></div>
    <div class="field"><label>Bill To (Client)</label><input id="to" type="text" placeholder="Client Name / Company"></div>
    <div class="field"><label>Invoice #</label><input id="invNum" type="text" placeholder="INV-001" value="INV-001"></div>
    <div class="field"><label>Invoice Date</label><input id="invDate" type="date"></div>
    <div class="field"><label>Due Date</label><input id="dueDate" type="date"></div>
    <div class="field"><label>Tax Rate (%)</label><input id="taxRate" type="number" value="0" step="0.1" oninput="calcTotals()"></div>
    <div class="field"><label>Discount (%)</label><input id="discount" type="number" value="0" step="0.1" oninput="calcTotals()"></div>
  </div>
</div>
<div class="form-card">
  <h2>Line Items</h2>
  <table style="width:100%;border-collapse:collapse">
    <thead><tr style="font-size:12px;color:var(--text2);text-align:left"><th style="padding:6px">Description</th><th style="padding:6px">Qty</th><th style="padding:6px">Rate ($)</th><th style="padding:6px;text-align:right">Total</th><th></th></tr></thead>
    <tbody id="lineItems"></tbody>
  </table>
  <button onclick="addRow()" style="margin-top:12px;padding:8px 16px;background:var(--primary-light);color:var(--primary);border:1.5px solid var(--primary);border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer">+ Add Item</button>
  <div style="margin-top:20px;text-align:right;font-size:14px;line-height:2">
    <div>Subtotal: <strong id="subtotal">$0.00</strong></div>
    <div>Discount: <strong id="discountAmt">-$0.00</strong></div>
    <div>Tax: <strong id="taxAmt">$0.00</strong></div>
    <div style="font-size:16px;font-weight:800;color:var(--primary)">Total Due: <strong id="totalAmt">$0.00</strong></div>
  </div>
  <div class="field full" style="margin-top:16px"><label>Notes / Payment Terms</label><textarea id="notes" placeholder="Payment due within 30 days. Thank you for your business."></textarea></div>
  <button class="btn-primary" onclick="generateInvoice()">Generate Invoice</button>
</div>
<div id="output" class="preview-card" style="display:none">
  <h2>Invoice Preview</h2>
  <pre id="preview" style="font-family:monospace;font-size:13px;line-height:1.8;white-space:pre-wrap"></pre>
  <div class="download-row">
    <button id="copyBtn" class="btn-dl btn-dl-doc" onclick="copyText()">Copy Text</button>
    <button class="btn-dl btn-dl-pdf" onclick="window.print()">Print / Save PDF</button>
  </div>
</div>"""

CSS = """*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--primary:#0891b2;--primary-dark:#0e7490;--primary-light:#ecfeff;--primary-dim:rgba(8,145,178,.08);--bg:#f8fafc;--bg2:#fff;--text:#1e293b;--text2:#475569;--text3:#94a3b8;--border:#e2e8f0;--radius:12px;--radius-sm:8px;--shadow:0 1px 3px rgba(0,0,0,.08),0 1px 6px rgba(0,0,0,.04)}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;min-height:100vh;display:flex;flex-direction:column}
a{text-decoration:none;color:inherit}
header{background:var(--bg2);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:100}
.header-inner{max-width:860px;margin:0 auto;padding:0 20px;height:60px;display:flex;align-items:center;gap:24px}
.logo{font-size:20px;font-weight:800;color:var(--text);letter-spacing:-.4px}
.logo span{color:var(--primary)}
.nav-all{margin-left:auto;font-size:14px;font-weight:600;color:var(--primary);padding:7px 16px;border:1.5px solid var(--primary);border-radius:var(--radius-sm);transition:all .15s}
.nav-all:hover{background:var(--primary);color:#fff}
.breadcrumb{max-width:860px;margin:16px auto 0;padding:0 20px;font-size:13px;color:var(--text3)}
.breadcrumb a{color:var(--primary)}
.breadcrumb span{margin:0 6px}
.ad-slot{width:100%;background:#f1f5f9;border:1px dashed #cbd5e1;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;color:var(--text3);font-size:12px;letter-spacing:.5px;text-transform:uppercase}
.ad-top{height:90px;min-height:90px}
.adsense-placeholder{width:100%;min-height:90px}
main{max-width:860px;margin:0 auto;padding:24px 20px 60px;width:100%;flex:1}
.tool-hero{margin-bottom:28px}
.tool-hero h1{font-size:1.9rem;font-weight:800;letter-spacing:-.4px;margin-bottom:8px}
.tool-hero p{font-size:15px;color:var(--text2);max-width:600px}
.form-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:32px;box-shadow:var(--shadow);margin-bottom:24px}
.form-card h2{font-size:1rem;font-weight:700;margin-bottom:20px;color:var(--text)}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.field{display:flex;flex-direction:column;gap:6px}
.field.full{grid-column:1/-1}
.field label{font-size:13px;font-weight:600;color:var(--text2)}
.field input,.field select,.field textarea{padding:10px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;color:var(--text);background:var(--bg2);transition:border-color .15s;outline:none}
.field input:focus,.field select:focus,.field textarea:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(8,145,178,.1)}
.field textarea{resize:vertical;min-height:80px}
.btn-primary{margin-top:20px;padding:12px 28px;background:var(--primary);color:#fff;border:none;border-radius:var(--radius-sm);font-size:15px;font-weight:700;cursor:pointer;transition:background .15s;font-family:inherit}
.btn-primary:hover{background:var(--primary-dark)}
.preview-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:32px;box-shadow:var(--shadow);margin-bottom:24px}
.preview-card h2{font-size:1rem;font-weight:700;margin-bottom:16px;color:var(--text)}
.download-row{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}
.btn-dl{padding:10px 22px;border-radius:var(--radius-sm);font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s;border:none}
.btn-dl-pdf{background:#dc2626;color:#fff}
.btn-dl-pdf:hover{background:#b91c1c}
.btn-dl-doc{background:var(--primary);color:#fff}
.btn-dl-doc:hover{background:var(--primary-dark)}
.seo-section{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:32px;box-shadow:var(--shadow);margin-bottom:24px}
.seo-section h2{font-size:1rem;font-weight:700;margin-bottom:12px}
.seo-section p{font-size:14px;color:var(--text2);line-height:1.8;margin-bottom:8px}
.related-section{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:32px;box-shadow:var(--shadow);margin-bottom:24px}
.related-section h2{font-size:1rem;font-weight:700;margin-bottom:16px}
.related-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.related-card{padding:14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);transition:all .15s}
.related-card:hover{border-color:var(--primary);background:var(--primary-light)}
.related-card-name{font-size:13px;font-weight:700;color:var(--primary)}
.related-card-desc{font-size:12px;color:var(--text3);margin-top:2px}
footer{background:var(--text);color:#94a3b8;padding:28px 20px}
.footer-inner{max-width:860px;margin:0 auto;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}
.footer-logo{font-size:16px;font-weight:800;color:#fff}
.footer-logo span{color:var(--primary)}
.footer-links{display:flex;gap:16px}
.footer-links a{color:#94a3b8;font-size:13px;transition:color .15s}
.footer-links a:hover{color:#fff}
.footer-copy{font-size:13px;width:100%}
@media(max-width:640px){.form-grid{grid-template-columns:1fr}.related-grid{grid-template-columns:1fr}.tool-hero h1{font-size:1.5rem}}
@media print{header,footer,.ad-slot,.download-row,.related-section,.seo-section{display:none!important}.preview-card,.form-card{box-shadow:none!important;border:none!important}}"""

def build_page(slug, title, cat, related_str):
    related_links = get_related_links(related_str)
    seo_text = get_seo_text(slug, title)
    form_html = get_form_html(slug, title)
    js = build_tool_js(slug, title)
    cat_label = cat_labels.get(cat, cat.title())

    related_cards = "\n".join([
        f'<a href="/tools/{s}.html" class="related-card"><div class="related-card-name">{n}</div><div class="related-card-desc">Free online tool</div></a>'
        for s, n in related_links
    ])

    meta_desc = f"Free {title} tool. Create professional {title.lower()} documents online in seconds. No signup required. | InvoiceFixPro"[:160]

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<!-- GA_PLACEHOLDER -->
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<title>{title} - Free Online Tool | InvoiceFixPro</title>
<meta name="description" content="{meta_desc}">
<link rel="canonical" href="https://invoicefixpro.com/tools/{slug}.html">
<style>{CSS}</style>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1638874323475457" crossorigin="anonymous"></script>
</head>
<body>
<header>
  <div class="header-inner">
    <a href="/" class="logo">Invoice<span>Fix</span>Pro</a>
    <a href="/" class="nav-all">All Tools</a>
  </div>
</header>
<div class="ad-slot ad-top"><div class="adsense-placeholder" data-pub="ca-pub-1638874323475457"></div></div>
<div class="breadcrumb"><a href="/">Home</a><span>›</span><a href="/">Tools</a><span>›</span>{title}</div>
<main>
  <div class="tool-hero">
    <h1>{title}</h1>
    <p>Free online {title.lower()} — no signup required. Generate and download professional documents instantly.</p>
  </div>
  {form_html}
  <div class="seo-section">
    <h2>About This Tool</h2>
    <p>{seo_text}</p>
  </div>
  <div class="related-section">
    <h2>Related Tools</h2>
    <div class="related-grid">{related_cards}</div>
  </div>
</main>
<footer>
  <div class="footer-inner">
    <div class="footer-logo">Invoice<span>Fix</span>Pro</div>
    <div class="footer-links">
      <a href="/about.html">About</a>
      <a href="/privacy.html">Privacy Policy</a>
      <a href="mailto:contact@invoicefixpro.com">Contact</a>
    </div>
    <div class="footer-copy">&copy; 2025 InvoiceFixPro. All rights reserved.</div>
  </div>
</footer>
<script>{js}</script>
</body>
</html>"""

out_dir = "C:/Users/Administrator/invoicefixpro/tools"
os.makedirs(out_dir, exist_ok=True)
count = 0
for item in tools:
    slug, title, cat, desc, related = item
    html = build_page(slug, title, cat, related)
    path = os.path.join(out_dir, f"{slug}.html")
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    count += 1

print(f"Generated {count} tool pages")
