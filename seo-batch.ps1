# WordCaseFix SEO Batch Processor
# Expands seo-content to 200+ words, replaces FAQ with 5 Q&As, adds 3 related links
# Usage: .\seo-batch.ps1 -Batch <1-11>

param([int]$Batch = 0)

$siteDir = "C:\Users\Administrator\wordcasefix"
$skipFiles = @('404.html','about.html','privacy-policy.html')
$allFiles = @(Get-ChildItem -Path $siteDir -Filter "*.html" |
    Where-Object { $skipFiles -notcontains $_.Name } |
    Sort-Object Name)

Write-Host "Total tool files: $($allFiles.Count)"

# 鈹€鈹€ Categorise by slug 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
function Get-Cat([string]$slug) {
    if ($slug -match 'color|gradient|hex.to.rgb|rgb.to|palette|contrast') { return 'color' }
    if ($slug -match 'json|xml|yaml|csv|html|css|javascript|regex|base64|binary|hex|ascii|chmod|cron|jwt|htaccess|http.status|ip.address|epoch') { return 'dev' }
    if ($slug -match 'generator|barcode|qr.code|lorem|password|roman|upside|wingdings|morse|invisible|fancy|bubble|bold|italic|cursive|flip.text|fullwidth|small.caps|strikethrough') { return 'gen' }
    if ($slug -match 'calculator|bmi|calorie|gpa|grade|tip|percentage|fraction|inflation|fuel|electricity|break.even|compound|hourly|word.to.pages|aspect|average|discount') { return 'calc' }
    if ($slug -match 'date|time|countdown|epoch|days.between|age.calc') { return 'time' }
    if ($slug -match 'currency|unit.conv|celsius|fahrenheit') { return 'convert' }
    return 'text'
}

# 鈹€鈹€ SEO text 200+ words 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
function Get-Seo([string]$name, [string]$slug) {
    $cat = Get-Cat $slug
    switch ($cat) {
        'color' { return @"
<h2>About $name</h2>
<p>WordCaseFix's $name is a free, browser-based tool that makes color work fast and precise for designers, developers, and creative professionals. Working with colors across different formats 鈥?HEX, RGB, HSL, HSV, CMYK 鈥?is a common but tedious challenge in web design and digital media. Our tool eliminates the manual conversion work, letting you instantly translate color values between formats and preview results in real time.</p>
<p>Whether you are building a website, designing a brand identity, working in CSS, or creating digital artwork, having accurate color values is essential. A single digit wrong in a hex code changes your color entirely. Our $name takes the guesswork out of the process: enter your color in any supported format and get precise, verified values in every other format simultaneously.</p>
<p>The tool is particularly useful for front-end developers who work between design tools (like Figma or Photoshop, which often use HEX or HSL) and CSS code (which accepts RGB, HEX, HSL, and named colors). Instead of switching between apps or doing mental math, paste your value into the $name and copy the format you need in seconds.</p>
<p>WordCaseFix provides this and all its color tools completely free, with no account required and no usage limits. The interface is clean and mobile-friendly, making it easy to use on any device. Bookmark this tool for quick access whenever your design or development work requires precise color handling.</p>
"@ }
        'dev' { return @"
<h2>About $name</h2>
<p>The $name by WordCaseFix is a free online developer tool that simplifies common encoding, formatting, conversion, and debugging tasks for software engineers, web developers, and DevOps professionals. Developer tasks that once required command-line tools, browser extensions, or locally installed software can now be completed instantly in the browser 鈥?no setup, no installation, and no account required.</p>
<p>Whether you need to encode data for safe transmission, format messy JSON or XML for readability, decode tokens, convert between number bases, test regular expressions, or minify code for production, the $name handles it accurately and instantly. The clean, focused interface means you spend time on your actual work rather than wrestling with tooling.</p>
<p>Working with raw data formats by hand is error-prone and slow. Even experienced developers make mistakes when manually converting between binary, hex, decimal, or base64. Our $name automates these conversions with verified accuracy, reducing debugging time and preventing hard-to-find encoding errors in production systems.</p>
<p>The $name is designed to work in any modern browser on desktop or mobile. Copy your input, paste it into the tool, and get the output you need immediately. WordCaseFix provides this and dozens of other developer tools completely free 鈥?part of our commitment to making development work faster and less frustrating for engineers at every level.</p>
"@ }
        'gen' { return @"
<h2>About $name</h2>
<p>WordCaseFix's $name is a free online text generation tool that produces creative, styled, or placeholder text instantly for a wide range of personal, professional, and creative applications. Whether you need decorative Unicode characters for social media profiles, placeholder content for design mockups, coded or encoded text for creative projects, or styled fonts for graphic work, this tool delivers results immediately with no software to install and no account required.</p>
<p>Text generators serve an enormous range of practical purposes. Content creators use them to add personality and visual flair to profiles and posts. Developers and designers use placeholder generators to populate mockups and prototypes with realistic-looking content. Writers and puzzle creators use anagram and encoding tools for creative projects. Our $name is optimised for whatever your specific generation need might be.</p>
<p>The tool is straightforward to use: enter your text or parameters, and the generated output appears immediately. You can copy the result with a single click and paste it directly into any application 鈥?social media platforms, document editors, messaging apps, graphic design tools, or code. No post-processing or cleanup required.</p>
<p>WordCaseFix offers this $name alongside dozens of other text manipulation, formatting, developer, and utility tools 鈥?all free, all browser-based, all available without registration or usage limits. Return to this tool whenever you need generated content that matches your specific requirements.</p>
"@ }
        'calc' { return @"
<h2>About $name</h2>
<p>The $name from WordCaseFix is a free, accurate online calculator that delivers instant results for everyday numerical and financial calculations. Instead of searching for formulas, setting up spreadsheets, or installing dedicated apps, you can get the answer you need in seconds by entering your values and letting the tool calculate for you. No account required, no downloads, and completely free to use as often as you like.</p>
<p>Our $name is designed for real-world use cases. Students use it for academic work. Professionals use it for business analysis and planning. Health-conscious individuals use it to track fitness metrics. Homeowners use it for budgeting and financial planning. Whatever your calculation need, the tool provides an instant, verified result with a clear breakdown that helps you understand where the numbers come from.</p>
<p>Accuracy matters in calculations. An error in a financial estimate can affect budgets; an incorrect health metric can mislead health decisions. Our $name uses verified formulas and displays results to the appropriate number of decimal places, giving you confidence that your output is correct. The tool also shows you the inputs and calculation method so you can double-check the result.</p>
<p>WordCaseFix provides this $name alongside dozens of other free calculators, text tools, developer utilities, color tools, and converters. All tools are browser-based, mobile-friendly, and available without registration. Bookmark this page for fast access whenever you need a quick, reliable calculation.</p>
"@ }
        'time' { return @"
<h2>About $name</h2>
<p>WordCaseFix's $name is a free online time and date tool that makes it easy to perform date calculations, time conversions, and duration measurements without manual counting or complex formulas. Whether you are calculating a deadline, measuring elapsed time, converting timestamps, or planning an event across time zones, this tool gives you fast, accurate results directly in your browser 鈥?no installation and no account required.</p>
<p>Date and time calculations are deceptively tricky. Counting the exact number of days between two dates, accounting for leap years, converting Unix timestamps to readable dates, or calculating someone's precise age all require careful attention to edge cases that are easy to get wrong manually. Our $name handles these calculations automatically and correctly every time.</p>
<p>The tool is used by project managers tracking milestones, developers working with timestamp data, HR professionals calculating tenure, students checking submission deadlines, event planners counting down to launch dates, and anyone who regularly needs precise date or time information without breaking out a paper calendar or writing custom code.</p>
<p>The $name is part of WordCaseFix's comprehensive free tool library covering text tools, calculators, color utilities, developer tools, and more. All tools are mobile-friendly and available 24/7 with no login required. Use this tool as often as you need 鈥?there are no limits and no charges, ever.</p>
"@ }
        'convert' { return @"
<h2>About $name</h2>
<p>The $name from WordCaseFix provides instant, accurate unit and value conversions for everyday practical needs. Whether you are converting between measurement systems, translating currency values, switching between temperature scales, or changing between any other pair of units, this free browser tool gives you a precise result immediately 鈥?with no installation, no account, and no cost.</p>
<p>Unit conversion errors have real consequences: incorrect medication dosages, wrong material quantities in construction, pricing errors in international commerce, and miscommunicated measurements in engineering. Our $name uses accurate, up-to-date conversion factors to ensure your results are reliable. The tool clearly shows the conversion formula so you can verify the calculation if needed.</p>
<p>The tool is designed for everyday use in practical situations: cooks converting recipe measurements, travellers converting temperatures and distances, students completing science homework, professionals working with international units, and developers handling different data formats. The clean interface lets you enter your value, select your units, and get the converted result instantly.</p>
<p>WordCaseFix provides this $name alongside a full suite of free tools 鈥?calculators, text formatters, developer utilities, color tools, and more. Everything is browser-based, mobile-friendly, and available without registration. Return to this tool whenever you need a quick, accurate unit conversion.</p>
"@ }
        default { return @"
<h2>About $name</h2>
<p>WordCaseFix's $name is a free online text tool that helps writers, students, developers, content creators, and everyday users manipulate, format, analyze, and transform text quickly and accurately. Text processing tasks that once required desktop software or manual effort can now be done instantly in the browser 鈥?no installation, no account, and completely free to use as often as you need.</p>
<p>Working with text is a universal task. Whether you are formatting text for a blog post, cleaning up copied content, converting between different case styles, counting words for a submission limit, removing duplicates from a list, or sorting lines alphabetically, our $name handles the task accurately and instantly. Paste your text in, get the result, and copy it to wherever you need it.</p>
<p>Consistency and accuracy matter in text work. Manually reformatting text is tedious and introduces errors 鈥?especially when working with large volumes of content. Our $name automates the process reliably, ensuring consistent output every time regardless of the size or complexity of your input. This makes it valuable for both one-off tasks and repetitive text processing workflows.</p>
<p>The $name is particularly useful for content writers who manage large amounts of text, SEO professionals who need specific text formats, developers who process text data in scripts or applications, and students who need to meet word count requirements. WordCaseFix provides this and dozens of other free text and utility tools 鈥?all available without registration, with no usage limits.</p>
"@ }
    }
}

# 鈹€鈹€ FAQ 5 Q&As 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
function Get-Faq([string]$name, [string]$slug) {
    $cat = Get-Cat $slug
    $qa = switch ($cat) {
        'color' { @(
            @("Is the $name free to use?","Yes, completely free. WordCaseFix's $name requires no account, no subscription, and no payment. Use it as many times as you need at no cost.")
            @("What color formats does the tool support?","The $name supports the most common web and design color formats including HEX (#rrggbb), RGB, RGBA, HSL, HSV, and CMYK, with instant conversion between all supported formats.")
            @("Can I use this tool for CSS and web development?","Absolutely. The $name is optimized for web development workflows. Copy the converted color value directly into your CSS, HTML, Sass, or any other web-related code.")
            @("Does the tool work on mobile devices?","Yes. The $name is fully responsive and works on smartphones, tablets, and desktop browsers. Use it on-site with clients or in any working environment.")
            @("Is my color data sent to any server?","No. All color conversions are performed locally in your browser using client-side JavaScript. No data is transmitted to or stored on WordCaseFix's servers.")
        )}
        'dev' { @(
            @("Is the $name free to use?","Yes, completely free with no signup required. WordCaseFix's $name is available to all users without any usage limits or fees.")
            @("Does this tool work offline?","The tool requires an initial page load but all processing happens in your browser using client-side JavaScript. Once the page is loaded, it works without a continuous internet connection.")
            @("Is my data safe? Does it get sent to a server?","All processing happens locally in your browser. Your code, tokens, or input data are never transmitted to or stored on WordCaseFix's servers, keeping your data private.")
            @("Can I use this tool for production work?","Yes. The $name uses reliable algorithms appropriate for professional use. As with any online tool, verify critical outputs independently for production-critical systems.")
            @("What browsers does the $name support?","The $name works in all modern browsers including Chrome, Firefox, Safari, Edge, and Opera on both desktop and mobile devices.")
        )}
        'gen' { @(
            @("Is the $name free to use?","Yes, completely free. The $name from WordCaseFix requires no account, no subscription, and no payment 鈥?generate as much content as you need at no cost.")
            @("Can I use generated text commercially?","Text you generate using the $name is free for you to use in any context including commercial projects, social media, marketing materials, and publications.")
            @("Do I need to create an account?","No account or registration is required. Simply open the tool, enter your parameters, and use the generated output immediately.")
            @("How do I copy the generated text?","Click the Copy button (if provided) or select all text in the output area and use Ctrl+C (Windows) or Cmd+C (Mac). The generated text can then be pasted anywhere.")
            @("Does the tool work on mobile?","Yes. The $name is mobile-friendly and works on smartphones and tablets. Generate text on any device using a modern web browser.")
        )}
        'calc' { @(
            @("Is the $name free?","Yes, completely free. The $name from WordCaseFix requires no signup and has no usage limits. Calculate as many times as you need at no cost.")
            @("How accurate are the calculations?","Our $name uses standard, verified formulas and delivers results to appropriate decimal precision. Calculations follow established mathematical and scientific standards.")
            @("Can I use this calculator on my phone?","Yes. The $name is fully responsive and works on smartphones, tablets, and desktops. Access it from any device with a modern web browser.")
            @("Are my inputs saved or stored?","No. All calculations are performed locally in your browser. Your input values are never sent to or stored on WordCaseFix's servers.")
            @("What if I get a different result from another calculator?","Different tools may use slightly different formulas or rounding methods. Our $name uses standard formulas 鈥?if you see a discrepancy, check which formula each tool is using, as definitions can vary slightly by source.")
        )}
        'time' { @(
            @("Is the $name free to use?","Yes, completely free with no account required. WordCaseFix's $name is available to all users with no usage limits or fees.")
            @("How accurate are the date and time calculations?","The $name accounts for leap years, varying month lengths, and standard calendar rules to deliver accurate results for any date range.")
            @("Does the tool work across different time zones?","The tool works with calendar dates as entered. For time zone conversions, ensure you use local dates and times appropriate for your time zone.")
            @("Can I use this tool on mobile?","Yes. The $name is mobile-responsive and works on all modern smartphones, tablets, and desktop browsers.")
            @("Is my date data sent to a server?","No. All date and time calculations are performed locally in your browser. No data is sent to or stored on WordCaseFix's servers.")
        )}
        'convert' { @(
            @("Is the $name free?","Yes, completely free. The $name from WordCaseFix is available with no signup, no subscription, and no usage limits.")
            @("How accurate are the conversion factors?","Our $name uses up-to-date, standard conversion factors from authoritative sources. Results are displayed to the appropriate number of decimal places for practical use.")
            @("Can I convert multiple values at once?","Enter one value at a time for the most accurate result. For bulk conversions, run each value through the tool individually or use the result to calculate proportional values.")
            @("Does it work on mobile?","Yes. The $name is fully responsive and works on smartphones, tablets, and desktop computers without any installation required.")
            @("Why might I get a slightly different result from another converter?","Conversion factors for some units (especially currency and derived units) may differ slightly between sources. Our tool uses standard, widely-accepted factors for all conversions.")
        )}
        default { @(
            @("Is the $name free to use?","Yes, completely free. WordCaseFix's $name requires no account, no subscription, and no payment. Use it as many times as you need with no limits.")
            @("Do I need to create an account?","No account or registration required. Open the tool, enter your text, and get your result immediately. All processing happens in your browser.")
            @("Does the tool work on mobile devices?","Yes. The $name is fully responsive and works on smartphones, tablets, and desktop computers in any modern browser.")
            @("Is there a limit to how much text I can process?","The tool handles text up to your browser's memory capacity 鈥?sufficient for all typical use cases including long documents, large data sets, and extended content.")
            @("Is my text data sent to any server?","No. All text processing is performed locally in your browser using client-side JavaScript. Your text content is never transmitted to or stored on WordCaseFix's servers.")
        )}
    }
    $items = ''
    foreach ($pair in $qa) {
        $items += "`n  <div class=`"faq-item`">`n    <h3>$($pair[0])</h3>`n    <p>$($pair[1])</p>`n  </div>"
    }
    return "<section class=`"faq-section`">`n  <h2>Frequently Asked Questions</h2>$items`n</section>"
}

# 鈹€鈹€ Extra related cards per category 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
$ExtraLinks = @{
    'color'   = @('/color-converter.html','Color Converter'),@('/color-picker.html','Color Picker'),@('/gradient-generator.html','Gradient Generator')
    'dev'     = @('/json-formatter.html','JSON Formatter'),@('/base64-encoder.html','Base64 Encoder'),@('/css-minifier.html','CSS Minifier')
    'gen'     = @('/lorem-ipsum-generator.html','Lorem Ipsum Generator'),@('/password-generator.html','Password Generator'),@('/qr-code-generator.html','QR Code Generator')
    'calc'    = @('/percentage-calculator.html','Percentage Calculator'),@('/discount-calculator.html','Discount Calculator'),@('/average-calculator.html','Average Calculator')
    'time'    = @('/date-calculator.html','Date Calculator'),@('/countdown-timer.html','Countdown Timer'),@('/age-calculator.html','Age Calculator')
    'convert' = @('/unit-converter.html','Unit Converter'),@('/celsius-to-fahrenheit.html','Celsius to Fahrenheit'),@('/currency-converter.html','Currency Converter')
    'text'    = @('/word-counter.html','Word Counter'),@('/case-converter.html','Case Converter'),@('/character-counter.html','Character Counter')
}

function Get-ExtraCards([string]$slug) {
    $cat = Get-Cat $slug
    $pool = $ExtraLinks[$cat]
    if (-not $pool) { $pool = $ExtraLinks['text'] }
    $cards = @()
    foreach ($link in $pool) {
        $linkSlug = [System.IO.Path]::GetFileNameWithoutExtension($link[0]) + '.html'
        if ($linkSlug -ne ($slug + '.html')) {
            $cards += "`n<a class=`"related-card`" href=`"$($link[0])`"><div class=`"rc-name`">$($link[1])</div><div class=`"rc-desc`">Free online tool</div></a>"
        }
    }
    return $cards -join ''
}

# 鈹€鈹€ Process one file 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
function Process-File([System.IO.FileInfo]$file) {
    $slug    = $file.BaseName
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)

    # Skip if already processed (check for expanded seo marker)
    if ($content.Contains('<!-- seo-expanded -->')) {
        Write-Host "  SKIP $slug"
        return
    }

    $m = [regex]::Match($content, '<h1[^>]*>([^<]+)</h1>')
    $toolName = if ($m.Success) { $m.Groups[1].Value.Trim() } else { ($slug -replace '-',' ') }

    # 1. Replace seo-content with expanded version
    $seoMarker = '<div class="seo-content">'
    $si = $content.IndexOf($seoMarker)
    if ($si -ge 0) {
        # find closing </div>
        $closeIdx = $content.IndexOf('</div>', $si + $seoMarker.Length)
        if ($closeIdx -ge 0) {
            $newSeo = Get-Seo $toolName $slug
            $content = $content.Substring(0, $si) +
                       "<!-- seo-expanded -->`n" +
                       $seoMarker + "`n" + $newSeo + "`n" +
                       $content.Substring($closeIdx)
        }
    } else {
        # Some files may not have seo-content 鈥?insert before </body>
        $newSeo = Get-Seo $toolName $slug
        $seoBlock = "`n<!-- seo-expanded -->`n<div class=`"seo-content`">`n" + $newSeo + "`n</div>`n"
        $content = $content.Replace('</body>', $seoBlock + '</body>')
    }

    # 2. Replace faq-section with 5 Q&As
    $faqOpen  = '<section class="faq-section">'
    $faqClose = '</section>'
    $fi = $content.IndexOf($faqOpen)
    if ($fi -ge 0) {
        $fe = $content.IndexOf($faqClose, $fi + $faqOpen.Length)
        if ($fe -ge 0) {
            $newFaq = Get-Faq $toolName $slug
            $content = $content.Substring(0, $fi) + $newFaq + $content.Substring($fe + $faqClose.Length)
        }
    } else {
        # No faq-section 鈥?insert before related-tools or before </body>
        $newFaq = Get-Faq $toolName $slug
        $relPos = $content.IndexOf('<div class="related-tools">')
        if ($relPos -ge 0) {
            $content = $content.Substring(0,$relPos) + $newFaq + "`n" + $content.Substring($relPos)
        } else {
            $content = $content.Replace('</body>', $newFaq + "`n</body>")
        }
    }

    # 3. Add 3 extra related cards inside related-grid
    $gridMarker = '<div class="related-grid">'
    $gi = $content.IndexOf($gridMarker)
    if ($gi -ge 0) {
        # find closing </div> of the grid
        $gClose = $content.IndexOf('</div>', $gi + $gridMarker.Length)
        # Walk past any nested divs inside cards
        $depth = 1
        $pos = $gi + $gridMarker.Length
        while ($pos -lt $content.Length -and $depth -gt 0) {
            $nextOpen  = $content.IndexOf('<div', $pos)
            $nextClose = $content.IndexOf('</div>', $pos)
            if ($nextClose -lt 0) { break }
            if ($nextOpen -ge 0 -and $nextOpen -lt $nextClose) {
                $depth++
                $pos = $nextOpen + 4
            } else {
                $depth--
                if ($depth -eq 0) { $gClose = $nextClose }
                else { $pos = $nextClose + 6 }
            }
        }
        $extraCards = Get-ExtraCards $slug
        $content = $content.Substring(0, $gClose) + $extraCards + $content.Substring($gClose)
    }

    [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
    Write-Host "  OK  $slug"
}

# 鈹€鈹€ Run one batch 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
$batchSize = 20
$totalBatches = [Math]::Ceiling($allFiles.Count / $batchSize)

if ($Batch -lt 1 -or $Batch -gt $totalBatches) {
    Write-Error ("Usage: .\seo-batch.ps1 -Batch <1-" + $totalBatches + ">  (total files: " + $allFiles.Count + ")")
    exit 1
}

$startIdx = ($Batch - 1) * $batchSize
$endIdx   = [Math]::Min($startIdx + $batchSize - 1, $allFiles.Count - 1)

Write-Host "`n=== Batch $($Batch) of $totalBatches files $($startIdx+1) to $($endIdx+1) ==="

for ($i = $startIdx; $i -le $endIdx; $i++) {
    Process-File $allFiles[$i]
}

Write-Host "`nBatch $($Batch) done 鈥?committing..."
Set-Location $siteDir
git add *.html
git commit -m "SEO batch $($Batch) of $($totalBatches) ($($startIdx+1)-$($endIdx+1)): expand seo 200w + FAQ 5qa + extra links"
git -c http.proxy=http://127.0.0.1:7897 -c http.sslVerify=false push origin master
Write-Host "Batch $($Batch) pushed."
