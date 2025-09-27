// Global variables for page navigation
let currentPage = 'page-input';
let calculationResults = null;

// Page Navigation Functions
function showPage(pageId) {
    // Hide all page contents
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(pageId).classList.add('active');
    
    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const navButton = document.querySelector(`[onclick="showPage('${pageId}')"]`);
    if (navButton) {
        navButton.classList.add('active');
    }
    
    currentPage = pageId;
    
    // Update page navigation buttons
    updateNavigationButtons(pageId);
}

function updateNavigationButtons(pageId) {
    const nextBtn = document.getElementById('nextPageBtn');
    const prevBtn = document.getElementById('prevPageBtn');
    const homeBtn = document.getElementById('homePageBtn');
    
    if (nextBtn && prevBtn && homeBtn) {
        // Reset visibility
        nextBtn.style.display = 'inline-block';
        prevBtn.style.display = 'inline-block';
        homeBtn.style.display = 'inline-block';
        
        // Update based on current page
        switch(pageId) {
            case 'page-input':
                prevBtn.style.display = 'none';
                nextBtn.onclick = () => showPage('page-results');
                break;
            case 'page-results':
                nextBtn.onclick = () => showPage('page-analysis');
                prevBtn.onclick = () => showPage('page-input');
                break;
            case 'page-analysis':
                nextBtn.onclick = () => showPage('page-report');
                prevBtn.onclick = () => showPage('page-results');
                break;
            case 'page-report':
                nextBtn.style.display = 'none';
                prevBtn.onclick = () => showPage('page-analysis');
                break;
        }
        
        homeBtn.onclick = () => showPage('page-input');
    }
}

function nextPage() {
    switch(currentPage) {
        case 'page-input':
            if (calculationResults) {
                showPage('page-results');
            } else {
                console.warn('Please calculate your retirement plan first!');
            }
            break;
        case 'page-results':
            showPage('page-analysis');
            break;
        case 'page-analysis':
            showPage('page-report');
            break;
    }
}

function previousPage() {
    switch(currentPage) {
        case 'page-results':
            showPage('page-input');
            break;
        case 'page-analysis':
            showPage('page-results');
            break;
        case 'page-report':
            showPage('page-analysis');
            break;
    }
}

function goHome() {
    showPage('page-input');
}

class RetirementCalculator {
    constructor() {
        this.form = document.getElementById('retirement-form');
        this.resultsSection = document.getElementById('results');
        this.currencySelect = document.getElementById('currencySelect');
        this.exchangeRateInfo = document.getElementById('exchangeRateInfo');
        this.chart = null;
        this.exchangeRates = {};
        this.currentCurrency = 'INR';
        this.baseCurrency = 'INR';
        this.savedScenarios = JSON.parse(localStorage.getItem('retirementScenarios') || '[]');
        
        this.currencyConfig = {
            'USD': { symbol: '$', name: 'US Dollar', step: 100, defaultIncome: 5000, defaultSavings: 50000 },
            'EUR': { symbol: '€', name: 'Euro', step: 100, defaultIncome: 4500, defaultSavings: 45000 },
            'GBP': { symbol: '£', name: 'British Pound', step: 100, defaultIncome: 4000, defaultSavings: 40000 },
            'JPY': { symbol: '¥', name: 'Japanese Yen', step: 10000, defaultIncome: 550000, defaultSavings: 5500000 },
            'CAD': { symbol: 'C$', name: 'Canadian Dollar', step: 100, defaultIncome: 6500, defaultSavings: 65000 },
            'AUD': { symbol: 'A$', name: 'Australian Dollar', step: 100, defaultIncome: 7500, defaultSavings: 75000 },
            'SGD': { symbol: 'S$', name: 'Singapore Dollar', step: 100, defaultIncome: 7000, defaultSavings: 70000 },
            'INR': { symbol: '₹', name: 'Indian Rupee', step: 5000, defaultIncome: 400000, defaultSavings: 4000000 }
        };

        this.helpTexts = {
            'current-age': 'Your current age in years. This determines how many years you have to save for retirement.',
            'retirement-age': 'The age at which you plan to retire and start using your retirement savings.',
            'life-expectancy': 'Your expected lifespan. This helps calculate how long your retirement funds need to last.',
            'monthly-income': 'The monthly income you want during retirement in today\'s purchasing power.',
            'inflation-rate': 'Expected annual inflation rate. Typically 2-4% in developed countries, 4-7% in developing countries.',
            'pre-retirement-roi': 'Expected annual return on investments before retirement. Typically 6-10% for mixed portfolios.',
            'post-retirement-roi': 'Expected annual return on investments during retirement. Usually lower than pre-retirement.',
            'current-savings': 'Your current retirement savings amount. This will grow until retirement.'
        };

        this.initialize();
    }

    initialize() {
        console.log('Initializing RetirementCalculator...');
        
        // Check if essential elements exist
        if (!this.form) {
            console.error('Retirement form not found! ID: retirement-form');
            return;
        }
        
        if (!this.currencySelect) {
            console.error('Currency select not found! ID: currencySelect');
            return;
        }
        
        this.setupEventListeners();
        this.updateExchangeRates();
        this.setupHelpSystem();
        this.loadSavedSettings();
        
        // Set default values based on currency
        this.updateDefaultValues();
        
        console.log('RetirementCalculator initialized successfully');
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Form submitted, starting calculation...');
                this.calculateRetirement();
            });
            console.log('Form submit listener added');
        } else {
            console.error('Cannot add form listener - form not found');
        }

        if (this.currencySelect) {
            this.currencySelect.addEventListener('change', (e) => {
                this.currentCurrency = e.target.value;
                this.updateDefaultValues();
                this.updateExchangeRateDisplay();
                this.saveSettings();
                console.log('Currency changed to:', this.currentCurrency);
            });
            console.log('Currency selector listener added');
        } else {
            console.error('Cannot add currency listener - currencySelect not found');
        }

        // Add export button listener
        const exportBtn = document.getElementById('export-results');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportResults());
        }

        // Add save scenario button listener
        const saveBtn = document.getElementById('save-scenario');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveScenario());
        }

        // Add print report button listener
        const printBtn = document.getElementById('print-report');
        if (printBtn) {
            printBtn.addEventListener('click', () => this.printReport());
        }

        // Add download PDF button listener
        const downloadBtn = document.getElementById('download-pdf');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadPDF());
        }

        // Add chart fullscreen listener
        const fullscreenBtn = document.getElementById('fullscreenChart');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.openFullscreenChart());
        }

        // Add chart download listener
        const downloadChartBtn = document.getElementById('downloadChart');
        if (downloadChartBtn) {
            downloadChartBtn.addEventListener('click', () => this.downloadChart());
        }

        // Add modal controls
        const closeModalBtn = document.getElementById('closeChartModal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeChartModal());
        }

        const downloadFullscreenBtn = document.getElementById('downloadFullscreenChart');
        if (downloadFullscreenBtn) {
            downloadFullscreenBtn.addEventListener('click', () => this.downloadFullscreenChart());
        }

        // Keyboard navigation removed to prevent focus lock

        // Close modal on background click
        const chartModal = document.getElementById('chartModal');
        if (chartModal) {
            chartModal.addEventListener('click', (e) => {
                if (e.target === chartModal) {
                    this.closeChartModal();
                }
            });
        }

        // Add real-time validation
        const inputs = this.form?.querySelectorAll('input, select');
        inputs?.forEach(input => {
            input.addEventListener('input', () => this.validateInput(input));
        });
    }

    validateInput(input) {
        const value = parseFloat(input.value);
        let isValid = true;
        let message = '';

        switch(input.id) {
            case 'currentAge':
                isValid = value >= 18 && value <= 80;
                message = 'Age must be between 18 and 80 years';
                break;
            case 'retirementAge':
                const currentAge = parseFloat(document.getElementById('currentAge')?.value || 0);
                isValid = value > currentAge && value <= 85;
                message = 'Retirement age must be greater than current age and not exceed 85';
                break;
            case 'lifeExpectancy':
                const retirementAge = parseFloat(document.getElementById('retirementAge')?.value || 0);
                isValid = value > retirementAge && value <= 120;
                message = 'Life expectancy must be greater than retirement age and realistic';
                break;
            case 'monthlyIncome':
                isValid = value > 0;
                message = 'Monthly income must be greater than 0';
                break;
            case 'inflationRate':
                isValid = value >= 0 && value <= 20;
                message = 'Inflation rate should be between 0% and 20%';
                break;
            case 'preRetirementROI':
            case 'postRetirementROI':
                isValid = value >= 0 && value <= 30;
                message = 'ROI should be between 0% and 30%';
                break;
            case 'currentSavings':
                isValid = value >= 0;
                message = 'Current savings cannot be negative';
                break;
        }

        // Update input styling
        if (isValid) {
            input.classList.remove('error');
            input.classList.add('valid');
        } else {
            input.classList.remove('valid');
            input.classList.add('error');
            console.warn('Validation warning:', message);
        }

        return isValid;
    }

    calculateRetirement() {
        try {
            console.log('calculateRetirement() method called');
            this.showLoadingOverlay();
            
            const data = this.getFormData();
            console.log('Form data retrieved:', data);
            
            if (!this.validateFormData(data)) {
                console.log('Form validation failed');
                this.hideLoadingOverlay();
                return;
            }

            console.log('Starting calculations...');
            const results = this.performCalculations(data);
            calculationResults = results; // Store globally for page navigation
            console.log('Calculations completed:', results);
            
            this.displayResults(results);
            this.generateChart(results);
            
            this.hideLoadingOverlay();
            console.log('Calculation completed successfully!');

            // Auto-navigate to results page
            setTimeout(() => {
                console.log('Navigating to results page...');
                showPage('page-results');
            }, 1000);

        } catch (error) {
            this.hideLoadingOverlay();
            console.error('Calculation error:', error);
            console.error('Error in calculation:', error.message);
            alert('Calculation error: ' + error.message); // Temporary debug alert
        }
    }

    getFormData() {
        return {
            currentAge: parseInt(document.getElementById('currentAge')?.value || 25),
            retirementAge: parseInt(document.getElementById('retirementAge')?.value || 60),
            lifeExpectancy: parseInt(document.getElementById('lifeExpectancy')?.value || 80),
            monthlyIncome: parseFloat(document.getElementById('monthlyIncome')?.value || 50000),
            inflationRate: parseFloat(document.getElementById('inflationRate')?.value || 6) / 100,
            preRetirementROI: parseFloat(document.getElementById('preRetirementROI')?.value || 12) / 100,
            postRetirementROI: parseFloat(document.getElementById('postRetirementROI')?.value || 8) / 100,
            currentSavings: parseFloat(document.getElementById('currentSavings')?.value || 0)
        };
    }

    validateFormData(data) {
        const errors = [];

        if (data.currentAge >= data.retirementAge) {
            errors.push('Retirement age must be greater than current age');
        }
        
        if (data.retirementAge >= data.lifeExpectancy) {
            errors.push('Life expectancy must be greater than retirement age');
        }

        if (data.monthlyIncome <= 0) {
            errors.push('Monthly income must be positive');
        }

        if (data.inflationRate < 0 || data.inflationRate > 0.3) {
            errors.push('Inflation rate seems unrealistic');
        }

        if (errors.length > 0) {
            console.error('Validation errors:', errors.join(', '));
            return false;
        }

        return true;
    }

    performCalculations(data) {
        const yearsToRetirement = data.retirementAge - data.currentAge;
        const yearsInRetirement = data.lifeExpectancy - data.retirementAge;
        
        // Adjust monthly income for inflation
        const monthlyExpenseAdjusted = data.monthlyIncome * Math.pow(1 + data.inflationRate, yearsToRetirement);
        const annualExpenseAdjusted = monthlyExpenseAdjusted * 12;
        
        // Calculate fund required at retirement start
        const realReturnRate = data.postRetirementROI - data.inflationRate;
        let totalFundsRequired;
        
        if (Math.abs(realReturnRate) < 0.001) {
            totalFundsRequired = annualExpenseAdjusted * yearsInRetirement;
        } else {
            totalFundsRequired = annualExpenseAdjusted * 
                ((1 - Math.pow(1 + realReturnRate, -yearsInRetirement)) / realReturnRate);
        }
        
        // Current savings value at retirement
        const currentSavingsAtRetirement = data.currentSavings * 
            Math.pow(1 + data.preRetirementROI, yearsToRetirement);
        
        // Required additional savings
        const additionalSavingsRequired = Math.max(0, totalFundsRequired - currentSavingsAtRetirement);
        
        // Monthly savings calculation
        const monthsToRetirement = yearsToRetirement * 12;
        let monthlySavings;
        
        if (data.preRetirementROI === 0) {
            monthlySavings = additionalSavingsRequired / monthsToRetirement;
        } else {
            const monthlyRate = data.preRetirementROI / 12;
            monthlySavings = additionalSavingsRequired * monthlyRate / 
                (Math.pow(1 + monthlyRate, monthsToRetirement) - 1);
        }

        return {
            yearsToRetirement,
            yearsInRetirement,
            monthlyExpenseAdjusted,
            annualIncomeNeeded: annualExpenseAdjusted,
            totalFundsRequired,
            currentSavingsAtRetirement,
            additionalSavingsRequired,
            monthlySavings: Math.max(0, monthlySavings),
            totalValueAtRetirement: totalFundsRequired,
            currentSavings: data.currentSavings
        };
    }

    displayResults(results) {
        // Update individual result elements
        const monthlySavingsEl = document.getElementById('monthlySavings');
        const yearsToRetirementEl = document.getElementById('yearsToRetirement');
        const yearsInRetirementEl = document.getElementById('yearsInRetirement');
        const annualIncomeNeededEl = document.getElementById('annualIncomeNeeded');
        const totalFundsRequiredEl = document.getElementById('totalFundsRequired');
        const currentSavingsFutureEl = document.getElementById('currentSavingsFuture');
        const additionalFundsNeededEl = document.getElementById('additionalFundsNeeded');
        const totalSavingsAtRetirementEl = document.getElementById('totalSavingsAtRetirement');

        if (monthlySavingsEl) monthlySavingsEl.textContent = this.formatCurrency(results.monthlySavings);
        if (yearsToRetirementEl) yearsToRetirementEl.textContent = results.yearsToRetirement;
        if (yearsInRetirementEl) yearsInRetirementEl.textContent = results.yearsInRetirement;
        if (annualIncomeNeededEl) annualIncomeNeededEl.textContent = this.formatCurrency(results.annualIncomeNeeded);
        if (totalFundsRequiredEl) totalFundsRequiredEl.textContent = this.formatCurrency(results.totalFundsRequired);
        if (currentSavingsFutureEl) currentSavingsFutureEl.textContent = this.formatCurrency(results.currentSavingsAtRetirement);
        if (additionalFundsNeededEl) additionalFundsNeededEl.textContent = this.formatCurrency(results.additionalSavingsRequired);
        if (totalSavingsAtRetirementEl) totalSavingsAtRetirementEl.textContent = this.formatCurrency(results.totalValueAtRetirement);
        
        // Update analysis page
        this.updateAnalysisPage(results);
        
        // Update report page
        this.updateReportPage(results);
    }

    updateAnalysisPage(results) {
        const breakdownEl = document.getElementById('calculationBreakdown');
        if (breakdownEl) {
            const data = this.getFormData();
            const breakdown = `
                <div class="breakdown-grid">
                    <div class="breakdown-item">
                        <h4>Input Summary</h4>
                        <p><strong>Current Age:</strong> ${data.currentAge} years</p>
                        <p><strong>Retirement Age:</strong> ${data.retirementAge} years</p>
                        <p><strong>Life Expectancy:</strong> ${data.lifeExpectancy} years</p>
                        <p><strong>Monthly Income Needed:</strong> ${this.formatCurrency(data.monthlyIncome)}</p>
                        <p><strong>Current Savings:</strong> ${this.formatCurrency(data.currentSavings)}</p>
                    </div>
                    
                    <div class="breakdown-item">
                        <h4>Financial Assumptions</h4>
                        <p><strong>Inflation Rate:</strong> ${(data.inflationRate * 100).toFixed(1)}%</p>
                        <p><strong>Pre-Retirement ROI:</strong> ${(data.preRetirementROI * 100).toFixed(1)}%</p>
                        <p><strong>Post-Retirement ROI:</strong> ${(data.postRetirementROI * 100).toFixed(1)}%</p>
                    </div>
                    
                    <div class="breakdown-item">
                        <h4>Key Calculations</h4>
                        <p><strong>Years to Save:</strong> ${results.yearsToRetirement} years</p>
                        <p><strong>Years in Retirement:</strong> ${results.yearsInRetirement} years</p>
                        <p><strong>Future Monthly Expense:</strong> ${this.formatCurrency(results.monthlyExpenseAdjusted)}</p>
                        <p><strong>Total Corpus Required:</strong> ${this.formatCurrency(results.totalFundsRequired)}</p>
                    </div>
                    
                    <div class="breakdown-item">
                        <h4>Savings Strategy</h4>
                        <p><strong>Monthly Savings Required:</strong> ${this.formatCurrency(results.monthlySavings)}</p>
                        <p><strong>Total Monthly Contribution:</strong> ${this.formatCurrency(results.monthlySavings)}</p>
                        <p><strong>Annual Savings Required:</strong> ${this.formatCurrency(results.monthlySavings * 12)}</p>
                        <p><strong>Current Savings Growth:</strong> ${this.formatCurrency(results.currentSavingsAtRetirement)}</p>
                    </div>
                </div>
            `;
            breakdownEl.innerHTML = breakdown;
        }
    }

    updateReportPage(results) {
        const data = this.getFormData();
        
        // Update report date and currency
        const reportDateEl = document.getElementById('report-date');
        const reportCurrencyEl = document.getElementById('report-currency');
        
        if (reportDateEl) reportDateEl.textContent = new Date().toLocaleDateString();
        if (reportCurrencyEl) reportCurrencyEl.textContent = this.currencyConfig[this.currentCurrency].name;
        
        // Update executive summary
        const summaryEl = document.getElementById('report-summary-content');
        if (summaryEl) {
            const monthlySavingsPercent = ((results.monthlySavings * 12) / (data.monthlyIncome * 12) * 100).toFixed(1);
            const summary = `
                <div class="summary-grid">
                    <div class="summary-highlight">
                        <h5>Monthly Savings Target</h5>
                        <p class="summary-value">${this.formatCurrency(results.monthlySavings)}</p>
                        <p class="summary-note">Required monthly savings to meet your retirement goals</p>
                    </div>
                    
                    <div class="summary-item">
                        <p><strong>Retirement Timeline:</strong> ${results.yearsToRetirement} years to save, ${results.yearsInRetirement} years in retirement</p>
                        <p><strong>Savings Rate:</strong> ${monthlySavingsPercent}% of current monthly income needed</p>
                        <p><strong>Total Corpus:</strong> ${this.formatCurrency(results.totalFundsRequired)} required at retirement</p>
                        <p><strong>Future Purchasing Power:</strong> ${this.formatCurrency(results.monthlyExpenseAdjusted)} monthly in future value</p>
                    </div>
                </div>
            `;
            summaryEl.innerHTML = summary;
        }
        
        // Update detailed breakdown
        const detailsEl = document.getElementById('report-details-content');
        if (detailsEl) {
            const details = `
                <div class="report-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Current Value</th>
                                <th>Future Value</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Monthly Income Need</td>
                                <td>${this.formatCurrency(data.monthlyIncome)}</td>
                                <td>${this.formatCurrency(results.monthlyExpenseAdjusted)}</td>
                                <td>Adjusted for ${(data.inflationRate * 100).toFixed(1)}% annual inflation</td>
                            </tr>
                            <tr>
                                <td>Current Savings</td>
                                <td>${this.formatCurrency(data.currentSavings)}</td>
                                <td>${this.formatCurrency(results.currentSavingsAtRetirement)}</td>
                                <td>Growing at ${(data.preRetirementROI * 100).toFixed(1)}% annual return</td>
                            </tr>
                            <tr>
                                <td>Additional Savings Needed</td>
                                <td>-</td>
                                <td>${this.formatCurrency(results.additionalSavingsRequired)}</td>
                                <td>Gap to be filled through monthly savings</td>
                            </tr>
                            <tr>
                                <td>Total Retirement Corpus</td>
                                <td>-</td>
                                <td>${this.formatCurrency(results.totalFundsRequired)}</td>
                                <td>Required to sustain ${results.yearsInRetirement} years of retirement</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
            detailsEl.innerHTML = details;
        }
        
        // Update recommendations
        const recommendationsEl = document.getElementById('report-recommendations-content');
        if (recommendationsEl) {
            let recommendations = [];
            
            const savingsRate = (results.monthlySavings * 12) / (data.monthlyIncome * 12);
            
            if (savingsRate > 0.3) {
                recommendations.push("📊 <strong>High Savings Rate:</strong> You need to save more than 30% of your income. Consider extending your retirement age or reducing retirement expenses.");
            } else if (savingsRate > 0.2) {
                recommendations.push("💡 <strong>Moderate Savings Rate:</strong> 20-30% savings rate is manageable. Consider maximizing tax-advantaged accounts.");
            } else {
                recommendations.push("✅ <strong>Achievable Goal:</strong> Your savings rate is under 20%, making this a realistic plan.");
            }
            
            if (results.yearsToRetirement < 15) {
                recommendations.push("⚡ <strong>Time Constraint:</strong> With less than 15 years to retirement, consider more aggressive investment strategies or higher savings rates.");
            }
            
            if (data.inflationRate > 0.05) {
                recommendations.push("📈 <strong>Inflation Impact:</strong> High inflation assumptions require more aggressive growth investments to maintain purchasing power.");
            }
            
            recommendations.push("🏦 <strong>Investment Strategy:</strong> Consider diversifying across equity, debt, and inflation-protected securities.");
            recommendations.push("📋 <strong>Regular Review:</strong> Reassess your plan annually and adjust for life changes, market performance, and inflation.");
            
            const recommendationsHtml = recommendations.map(rec => `<div class="recommendation-item">${rec}</div>`).join('');
            recommendationsEl.innerHTML = recommendationsHtml;
        }
    }

    generateChart(results) {
        const ctx = document.getElementById('savingsChart');
        if (!ctx) return;

        const data = this.getFormData();
        const years = Array.from({length: results.yearsToRetirement + 1}, (_, i) => i);
        
        // Calculate different data series for comprehensive visualization
        const currentSavingsGrowth = years.map(year => {
            return data.currentSavings * Math.pow(1 + data.preRetirementROI, year);
        });

        const monthlySavingsGrowth = years.map(year => {
            if (year === 0) return 0;
            const monthlyRate = data.preRetirementROI / 12;
            const months = year * 12;
            if (monthlyRate === 0) {
                return results.monthlySavings * months;
            }
            return results.monthlySavings * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
        });

        const totalSavingsGrowth = years.map((year, index) => {
            return currentSavingsGrowth[index] + monthlySavingsGrowth[index];
        });

        const inflationAdjustedValue = years.map(year => {
            const futureValue = totalSavingsGrowth[year];
            return futureValue / Math.pow(1 + data.inflationRate, year);
        });

        // Target line (total funds required)
        const targetLine = years.map(() => results.totalFundsRequired);

        // Create beautiful gradients
        const currentSavingsGradient = ctx.createLinearGradient(0, 0, 0, 400);
        currentSavingsGradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)');
        currentSavingsGradient.addColorStop(1, 'rgba(34, 197, 94, 0.1)');

        const monthlyGradient = ctx.createLinearGradient(0, 0, 0, 400);
        monthlyGradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
        monthlyGradient.addColorStop(1, 'rgba(59, 130, 246, 0.1)');

        const totalGradient = ctx.createLinearGradient(0, 0, 0, 400);
        totalGradient.addColorStop(0, 'rgba(147, 51, 234, 0.8)');
        totalGradient.addColorStop(1, 'rgba(147, 51, 234, 0.1)');

        const inflationGradient = ctx.createLinearGradient(0, 0, 0, 400);
        inflationGradient.addColorStop(0, 'rgba(251, 146, 60, 0.6)');
        inflationGradient.addColorStop(1, 'rgba(251, 146, 60, 0.05)');

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years.map(year => `Year ${year}`),
                datasets: [
                    {
                        label: '💰 Current Savings Growth',
                        data: currentSavingsGrowth,
                        borderColor: '#22C55E',
                        backgroundColor: currentSavingsGradient,
                        fill: false,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 4,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#22C55E',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointHoverBackgroundColor: '#ffffff',
                        pointHoverBorderColor: '#22C55E',
                        pointHoverBorderWidth: 3,
                        shadow: true
                    },
                    {
                        label: '📈 Monthly Contributions',
                        data: monthlySavingsGrowth,
                        borderColor: '#3B82F6',
                        backgroundColor: monthlyGradient,
                        fill: false,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 4,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#3B82F6',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointHoverBackgroundColor: '#ffffff',
                        pointHoverBorderColor: '#3B82F6',
                        pointHoverBorderWidth: 3
                    },
                    {
                        label: '🚀 Total Savings Growth',
                        data: totalSavingsGrowth,
                        borderColor: '#9333EA',
                        backgroundColor: totalGradient,
                        fill: true,
                        tension: 0.4,
                        borderWidth: 4,
                        pointRadius: 5,
                        pointHoverRadius: 10,
                        pointBackgroundColor: '#9333EA',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 3,
                        pointHoverBackgroundColor: '#ffffff',
                        pointHoverBorderColor: '#9333EA',
                        pointHoverBorderWidth: 4
                    },
                    {
                        label: '📊 Real Value (Inflation-Adjusted)',
                        data: inflationAdjustedValue,
                        borderColor: '#FB923C',
                        backgroundColor: inflationGradient,
                        fill: false,
                        tension: 0.4,
                        borderWidth: 3,
                        borderDash: [8, 4],
                        pointRadius: 4,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#FB923C',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointHoverBackgroundColor: '#ffffff',
                        pointHoverBorderColor: '#FB923C',
                        pointHoverBorderWidth: 3
                    },
                    {
                        label: '🎯 Target Required',
                        data: targetLine,
                        borderColor: '#EF4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: false,
                        tension: 0,
                        borderWidth: 3,
                        borderDash: [12, 6],
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#EF4444',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 20,
                        right: 20,
                        bottom: 20,
                        left: 20
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    title: {
                        display: true,
                        text: `📊 Retirement Savings Projection (${this.currencyConfig[this.currentCurrency].name})`,
                        font: {
                            size: 18,
                            weight: 'bold',
                            family: 'system-ui, -apple-system, sans-serif'
                        },
                        padding: 25,
                        color: '#1F2937'
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'center',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20,
                            font: {
                                size: 12,
                                weight: '600',
                                family: 'system-ui, -apple-system, sans-serif'
                            },
                            color: '#374151',
                            boxWidth: 12,
                            boxHeight: 12
                        }
                    },
                    tooltip: {
                        enabled: true,
                        position: 'nearest',
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#F9FAFB',
                        bodyColor: '#F3F4F6',
                        borderColor: '#6B7280',
                        borderWidth: 1,
                        cornerRadius: 12,
                        displayColors: true,
                        padding: 16,
                        titleFont: {
                            size: 14,
                            weight: 'bold',
                            family: 'system-ui, -apple-system, sans-serif'
                        },
                        bodyFont: {
                            size: 12,
                            family: 'system-ui, -apple-system, sans-serif'
                        },
                        footerFont: {
                            size: 11,
                            weight: 'bold',
                            family: 'system-ui, -apple-system, sans-serif'
                        },
                        footerColor: '#FCD34D',
                        usePointStyle: true,
                        boxPadding: 6,
                        caretPadding: 8,
                        caretSize: 8,
                        callbacks: {
                            title: (tooltipItems) => {
                                const year = tooltipItems[0].dataIndex;
                                const age = data.currentAge + year;
                                return `📅 Year ${year} (Age ${age})`;
                            },
                            label: (context) => {
                                const value = context.parsed.y;
                                const formattedValue = this.formatCurrency(value);
                                
                                if (context.datasetIndex === 4) {
                                    return `🎯 ${context.dataset.label.replace('🎯 ', '')}: ${formattedValue}`;
                                }
                                
                                const targetValue = results.totalFundsRequired;
                                const percentage = ((value / targetValue) * 100).toFixed(1);
                                return `${context.dataset.label}: ${formattedValue} (${percentage}% of target)`;
                            },
                            footer: (tooltipItems) => {
                                const year = tooltipItems[0].dataIndex;
                                const totalValue = totalSavingsGrowth[year];
                                const targetValue = results.totalFundsRequired;
                                
                                if (totalValue >= targetValue) {
                                    const surplus = totalValue - targetValue;
                                    return `✅ Target achieved! Surplus: ${this.formatCurrency(surplus)}`;
                                } else {
                                    const shortfall = targetValue - totalValue;
                                    return `⚠️ Shortfall: ${this.formatCurrency(shortfall)}`;
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'category',
                        title: {
                            display: true,
                            text: '📅 Timeline (Years from Now)',
                            font: {
                                size: 14,
                                weight: 'bold',
                                family: 'system-ui, -apple-system, sans-serif'
                            },
                            color: '#374151',
                            padding: 10
                        },
                        grid: {
                            color: 'rgba(156, 163, 175, 0.2)',
                            drawBorder: false,
                            lineWidth: 1
                        },
                        ticks: {
                            callback: function(value, index) {
                                const year = index;
                                const age = data.currentAge + year;
                                
                                if (year % 5 === 0 || year === results.yearsToRetirement) {
                                    return [`Year ${year}`, `Age ${age}`];
                                }
                                return year % 2 === 0 ? `${year}` : '';
                            },
                            maxRotation: 0,
                            color: '#6B7280',
                            font: {
                                size: 10,
                                family: 'system-ui, -apple-system, sans-serif'
                            },
                            padding: 8
                        },
                        border: {
                            display: false
                        }
                    },
                    y: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: `💰 Amount (${this.currencyConfig[this.currentCurrency].symbol})`,
                            font: {
                                size: 14,
                                weight: 'bold',
                                family: 'system-ui, -apple-system, sans-serif'
                            },
                            color: '#374151',
                            padding: 15
                        },
                        grid: {
                            color: 'rgba(156, 163, 175, 0.15)',
                            drawBorder: false,
                            lineWidth: 1
                        },
                        ticks: {
                            callback: (value) => {
                                return this.formatCurrency(value);
                            },
                            color: '#6B7280',
                            font: {
                                size: 11,
                                family: 'system-ui, -apple-system, sans-serif'
                            },
                            padding: 8,
                            maxTicksLimit: 8
                        },
                        beginAtZero: true,
                        border: {
                            display: false
                        }
                    }
                },
                elements: {
                    point: {
                        hoverBackgroundColor: '#ffffff',
                        hoverBorderWidth: 3,
                        radius: 4,
                        hitRadius: 8
                    },
                    line: {
                        borderJoinStyle: 'round',
                        borderCapStyle: 'round'
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeInOutCubic',
                    animateRotate: true,
                    animateScale: true
                }
            }
        });

        // Add a beautiful summary below the chart
        this.addChartSummary(results, data);
    }

    addChartSummary(results, data) {
        const chartContainer = document.querySelector('.chart-container');
        if (!chartContainer) return;

        // Remove existing summary
        const existingSummary = chartContainer.querySelector('.chart-summary');
        if (existingSummary) existingSummary.remove();

        const finalValue = data.currentSavings * Math.pow(1 + data.preRetirementROI, results.yearsToRetirement) +
            (results.monthlySavings * 12 * results.yearsToRetirement * (1 + data.preRetirementROI));

        const targetAchieved = finalValue >= results.totalFundsRequired;
        const difference = Math.abs(finalValue - results.totalFundsRequired);
        const achievementPercentage = ((finalValue / results.totalFundsRequired) * 100).toFixed(1);

        const summaryHtml = `
            <div class="chart-summary">
                <h4>📊 Chart Insights</h4>
                <div class="chart-insights">
                    <div class="insight-item ${targetAchieved ? 'success' : 'warning'}">
                        <strong>Target Achievement:</strong> ${achievementPercentage}% of required corpus
                        ${targetAchieved ? 
                            `✅ Surplus of ${this.formatCurrency(difference)}` : 
                            `⚠️ Shortfall of ${this.formatCurrency(difference)}`
                        }
                    </div>
                    
                    <div class="insight-item">
                        <strong>Growth Breakdown:</strong>
                        <ul>
                            <li><span class="color-indicator" style="background: #10B981;"></span>
                                Current Savings Growth: ${this.formatCurrency(data.currentSavings * Math.pow(1 + data.preRetirementROI, results.yearsToRetirement))}
                            </li>
                            <li><span class="color-indicator" style="background: #3B82F6;"></span>
                                Monthly Contributions: ${this.formatCurrency(results.monthlySavings)} × ${results.yearsToRetirement * 12} months
                            </li>
                            <li><span class="color-indicator" style="background: #F59E0B;"></span>
                                Inflation Impact: Reduces purchasing power by ${((1 - (1 / Math.pow(1 + data.inflationRate, results.yearsToRetirement))) * 100).toFixed(1)}%
                            </li>
                        </ul>
                    </div>
                    
                    <div class="insight-item">
                        <strong>Key Milestones:</strong>
                        <ul>
                            <li>25% Progress (Age ${data.currentAge + Math.floor(results.yearsToRetirement * 0.25)}): ${this.formatCurrency(finalValue * 0.4)}</li>
                            <li>50% Progress (Age ${data.currentAge + Math.floor(results.yearsToRetirement * 0.5)}): ${this.formatCurrency(finalValue * 0.65)}</li>
                            <li>75% Progress (Age ${data.currentAge + Math.floor(results.yearsToRetirement * 0.75)}): ${this.formatCurrency(finalValue * 0.85)}</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;

        chartContainer.insertAdjacentHTML('beforeend', summaryHtml);
    }

    updateExchangeRates() {
        // Using a free API for exchange rates
        fetch('https://api.exchangerate-api.com/v4/latest/USD')
            .then(response => response.json())
            .then(data => {
                this.exchangeRates = data.rates;
                this.exchangeRates.USD = 1; // Base currency
                this.updateExchangeRateDisplay();
            })
            .catch(error => {
                console.warn('Failed to fetch live exchange rates, using defaults:', error);
                // Fallback to default rates
                this.exchangeRates = {
                    'USD': 1.00,
                    'EUR': 0.85,
                    'GBP': 0.73,
                    'JPY': 149.50,
                    'CAD': 1.35,
                    'AUD': 1.50,
                    'SGD': 1.35,
                    'INR': 83.25
                };
                this.updateExchangeRateDisplay();
            });
    }

    updateExchangeRateDisplay() {
        if (!this.exchangeRateInfo) return;
        
        const rate = this.exchangeRates[this.currentCurrency];
        if (rate && this.currentCurrency !== 'USD') {
            this.exchangeRateInfo.innerHTML = `
                <small>Exchange Rate: 1 USD = ${rate.toFixed(2)} ${this.currentCurrency}</small>
            `;
        } else {
            this.exchangeRateInfo.innerHTML = '';
        }
    }

    convertCurrency(amount, fromCurrency = 'USD', toCurrency = this.currentCurrency) {
        if (fromCurrency === toCurrency) return amount;
        
        const fromRate = this.exchangeRates[fromCurrency] || 1;
        const toRate = this.exchangeRates[toCurrency] || 1;
        
        // Convert to USD first, then to target currency
        const usdAmount = amount / fromRate;
        return usdAmount * toRate;
    }

    formatCurrency(amount, curr = this.currentCurrency) {
        const config = this.currencyConfig[curr];
        if (!config) return amount.toString();
        
        const convertedAmount = this.convertCurrency(amount, this.baseCurrency, curr);
        
        if (curr === 'INR' || curr === 'JPY') {
            if (convertedAmount >= 10000000) {
                return config.symbol + (convertedAmount / 10000000).toFixed(1) + 'Cr';
            } else if (convertedAmount >= 100000) {
                return config.symbol + (convertedAmount / 100000).toFixed(1) + 'L';
            } else if (convertedAmount >= 1000) {
                return config.symbol + (convertedAmount / 1000).toFixed(0) + 'K';
            }
        } else {
            if (convertedAmount >= 1000000) {
                return config.symbol + (convertedAmount / 1000000).toFixed(1) + 'M';
            } else if (convertedAmount >= 1000) {
                return config.symbol + (convertedAmount / 1000).toFixed(0) + 'K';
            }
        }
        
        const localeOptions = {
            minimumFractionDigits: curr === 'JPY' ? 0 : 0,
            maximumFractionDigits: curr === 'JPY' ? 0 : 0
        };
        
        return config.symbol + convertedAmount.toLocaleString('en-US', localeOptions);
    }

    updateDefaultValues() {
        const config = this.currencyConfig[this.currentCurrency];
        if (!config) return;

        const monthlyIncomeInput = document.getElementById('monthlyIncome');
        const currentSavingsInput = document.getElementById('currentSavings');

        if (monthlyIncomeInput && !monthlyIncomeInput.value) {
            monthlyIncomeInput.value = config.defaultIncome;
            monthlyIncomeInput.step = config.step;
        }

        if (currentSavingsInput && !currentSavingsInput.value) {
            currentSavingsInput.value = config.defaultSavings;
            currentSavingsInput.step = config.step;
        }
    }

    setupHelpSystem() {
        // Add help icons and popups
        Object.keys(this.helpTexts).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && field.parentElement) {
                const helpIcon = document.createElement('span');
                helpIcon.className = 'help-icon';
                helpIcon.innerHTML = '?';
                helpIcon.title = this.helpTexts[fieldId];
                helpIcon.addEventListener('click', () => {
                    this.showHelpPopup(this.helpTexts[fieldId]);
                });
                
                field.parentElement.appendChild(helpIcon);
            }
        });
    }

    showHelpPopup(text) {
        const popup = document.createElement('div');
        popup.className = 'help-popup';
        popup.innerHTML = `
            <div class="help-content">
                <button class="close-help" onclick="this.parentElement.parentElement.remove()">×</button>
                <p>${text}</p>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        setTimeout(() => {
            if (popup.parentElement) {
                popup.remove();
            }
        }, 5000);
    }

    // Removed toast notifications - using console logging instead

    showLoadingOverlay() {
        const indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.style.display = 'flex';
        }
    }

    hideLoadingOverlay() {
        const indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    saveSettings() {
        const settings = {
            currency: this.currentCurrency,
            lastUsed: new Date().toISOString()
        };
        localStorage.setItem('retirementCalculatorSettings', JSON.stringify(settings));
    }

    loadSavedSettings() {
        const saved = localStorage.getItem('retirementCalculatorSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.currentCurrency = settings.currency || 'INR';
            
            if (this.currencySelect) {
                this.currencySelect.value = this.currentCurrency;
            }
        }
    }

    exportResults() {
        try {
            const data = this.getFormData();
            const results = this.performCalculations(data);
            
            const exportData = {
                date: new Date().toISOString(),
                currency: this.currentCurrency,
                inputs: data,
                results: results,
                formattedResults: {
                    monthlySavings: this.formatCurrency(results.monthlySavings),
                    totalFundsRequired: this.formatCurrency(results.totalFundsRequired),
                    currentSavings: this.formatCurrency(results.currentSavings),
                    totalValueAtRetirement: this.formatCurrency(results.totalValueAtRetirement),
                    monthlyExpenseAdjusted: this.formatCurrency(results.monthlyExpenseAdjusted),
                    annualIncomeNeeded: this.formatCurrency(results.annualIncomeNeeded)
                }
            };

            const csvContent = "Retirement Planning Results\n\n" +
                `Generated on: ${new Date().toLocaleDateString()}\n` +
                `Currency: ${this.currencyConfig[this.currentCurrency].name}\n\n` +
                "INPUT PARAMETERS\n" +
                `Current Age,${data.currentAge}\n` +
                `Retirement Age,${data.retirementAge}\n` +
                `Life Expectancy,${data.lifeExpectancy}\n` +
                `Monthly Income Need,${this.formatCurrency(data.monthlyIncome)}\n` +
                `Inflation Rate,${(data.inflationRate * 100).toFixed(1)}%\n` +
                `Pre-Retirement ROI,${(data.preRetirementROI * 100).toFixed(1)}%\n` +
                `Post-Retirement ROI,${(data.postRetirementROI * 100).toFixed(1)}%\n` +
                `Current Savings,${this.formatCurrency(data.currentSavings)}\n\n` +
                "RESULTS\n" +
                `Years to Retirement,${results.yearsToRetirement}\n` +
                `Years in Retirement,${results.yearsInRetirement}\n` +
                `Monthly Savings Required,${this.formatCurrency(results.monthlySavings)}\n` +
                `Total Funds Required,${this.formatCurrency(results.totalFundsRequired)}\n` +
                `Annual Income Needed,${this.formatCurrency(results.annualIncomeNeeded)}\n`;
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `retirement_plan_${new Date().getTime()}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('Results exported successfully!');
        } catch (error) {
            console.error('Export error:', error);
            console.error('Failed to export results', error);
        }
    }

    saveScenario() {
        try {
            const data = this.getFormData();
            const results = this.performCalculations(data);
            
            const scenarioName = prompt('Enter a name for this scenario:');
            if (!scenarioName) return;
            
            const scenario = {
                id: Date.now(),
                name: scenarioName,
                date: new Date().toISOString(),
                currency: this.currentCurrency,
                data: data,
                results: results
            };
            
            this.savedScenarios.push(scenario);
            localStorage.setItem('retirementScenarios', JSON.stringify(this.savedScenarios));
            
            console.log(`Scenario "${scenarioName}" saved successfully!`);
        } catch (error) {
            console.error('Save scenario error:', error);
            console.error('Failed to save scenario', error);
        }
    }

    printReport() {
        // Create a new window with only the report content
        const reportContent = document.getElementById('page-report').innerHTML;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Retirement Planning Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .report-section { max-width: 800px; margin: 0 auto; }
                        .summary-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 20px; margin: 20px 0; }
                        .summary-highlight { background: #f0f8ff; padding: 15px; border-radius: 8px; }
                        .summary-value { font-size: 24px; font-weight: bold; color: #2563eb; margin: 10px 0; }
                        .report-table table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        .report-table th, .report-table td { padding: 12px; border: 1px solid #ddd; text-align: left; }
                        .report-table th { background: #f5f5f5; }
                        .recommendation-item { margin: 10px 0; padding: 10px; background: #f9f9f9; border-left: 4px solid #2563eb; }
                        .breakdown-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
                        .breakdown-item { padding: 15px; background: #f8f9fa; border-radius: 8px; }
                        @media print { .report-actions { display: none; } }
                    </style>
                </head>
                <body>${reportContent}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }

    downloadPDF() {
        console.info('PDF download feature requires additional libraries. Using print to PDF instead.');
        setTimeout(() => {
            this.printReport();
        }, 1000);
    }

    // Modal functionality removed - chart displays inline only

    // Fullscreen chart functionality removed - using inline chart only
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        fill: false,
                        tension: 0.4,
                        borderWidth: 4,
                        pointRadius: 5,
                        pointHoverRadius: 10,
                        pointBackgroundColor: '#22C55E',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 3,
                        pointHoverBackgroundColor: '#ffffff',
                        pointHoverBorderColor: '#22C55E',
                        pointHoverBorderWidth: 4
                    },
                    {
                        label: '📈 Monthly Contributions',
                        data: monthlySavingsGrowth,
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: false,
                        tension: 0.4,
                        borderWidth: 4,
                        pointRadius: 5,
                        pointHoverRadius: 10,
                        pointBackgroundColor: '#3B82F6',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 3,
                        pointHoverBackgroundColor: '#ffffff',
                        pointHoverBorderColor: '#3B82F6',
                        pointHoverBorderWidth: 4
                    },
                    {
                        label: '🚀 Total Savings Growth',
                        data: totalSavingsGrowth,
                        borderColor: '#9333EA',
                        backgroundColor: 'rgba(147, 51, 234, 0.2)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 5,
                        pointRadius: 6,
                        pointHoverRadius: 12,
                        pointBackgroundColor: '#9333EA',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 3,
                        pointHoverBackgroundColor: '#ffffff',
                        pointHoverBorderColor: '#9333EA',
                        pointHoverBorderWidth: 4
                    },
                    {
                        label: '📊 Real Value (Inflation-Adjusted)',
                        data: inflationAdjustedValue,
                        borderColor: '#FB923C',
                        backgroundColor: 'rgba(251, 146, 60, 0.1)',
                        fill: false,
                        tension: 0.4,
                        borderWidth: 4,
                        borderDash: [12, 6],
                        pointRadius: 5,
                        pointHoverRadius: 10,
                        pointBackgroundColor: '#FB923C',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 3,
                        pointHoverBackgroundColor: '#ffffff',
                        pointHoverBorderColor: '#FB923C',
                        pointHoverBorderWidth: 4
                    },
                    {
                        label: '🎯 Target Required',
                        data: targetLine,
                        borderColor: '#EF4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: false,
                        tension: 0,
                        borderWidth: 4,
                        borderDash: [18, 8],
                        pointRadius: 0,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#EF4444',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 30,
                        right: 30,
                        bottom: 30,
                        left: 30
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    title: {
                        display: true,
                        text: `📊 Retirement Savings Projection - Full Screen View (${this.currencyConfig[this.currentCurrency].name})`,
                        font: {
                            size: 24,
                            weight: 'bold',
                            family: 'system-ui, -apple-system, sans-serif'
                        },
                        padding: 35,
                        color: '#1F2937'
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'center',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 25,
                            font: {
                                size: 14,
                                weight: '600',
                                family: 'system-ui, -apple-system, sans-serif'
                            },
                            color: '#374151',
                            boxWidth: 15,
                            boxHeight: 15
                        }
                    },
                    tooltip: {
                        enabled: true,
                        position: 'nearest',
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#F9FAFB',
                        bodyColor: '#F3F4F6',
                        borderColor: '#6B7280',
                        borderWidth: 2,
                        cornerRadius: 15,
                        displayColors: true,
                        padding: 20,
                        titleFont: {
                            size: 16,
                            weight: 'bold',
                            family: 'system-ui, -apple-system, sans-serif'
                        },
                        bodyFont: {
                            size: 14,
                            family: 'system-ui, -apple-system, sans-serif'
                        },
                        footerFont: {
                            size: 13,
                            weight: 'bold',
                            family: 'system-ui, -apple-system, sans-serif'
                        },
                        footerColor: '#FCD34D',
                        usePointStyle: true,
                        boxPadding: 8,
                        caretPadding: 12,
                        caretSize: 10,
                        callbacks: {
                            title: (tooltipItems) => {
                                const year = tooltipItems[0].dataIndex;
                                const age = data.currentAge + year;
                                return `📅 Year ${year} (Age ${age})`;
                            },
                            label: (context) => {
                                const value = context.parsed.y;
                                const formattedValue = this.formatCurrency(value);
                                
                                if (context.datasetIndex === 4) {
                                    return `🎯 ${context.dataset.label.replace('🎯 ', '')}: ${formattedValue}`;
                                }
                                
                                const targetValue = results.totalFundsRequired;
                                const percentage = ((value / targetValue) * 100).toFixed(1);
                                return `${context.dataset.label}: ${formattedValue} (${percentage}% of target)`;
                            },
                            footer: (tooltipItems) => {
                                const year = tooltipItems[0].dataIndex;
                                const totalValue = totalSavingsGrowth[year];
                                const targetValue = results.totalFundsRequired;
                                
                                if (totalValue >= targetValue) {
                                    const surplus = totalValue - targetValue;
                                    return `✅ Target achieved! Surplus: ${this.formatCurrency(surplus)}`;
                                } else {
                                    const shortfall = targetValue - totalValue;
                                    return `⚠️ Shortfall: ${this.formatCurrency(shortfall)}`;
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '📅 Timeline (Years from Now)',
                            font: {
                                size: 18,
                                weight: 'bold',
                                family: 'system-ui, -apple-system, sans-serif'
                            },
                            color: '#374151',
                            padding: 15
                        },
                        grid: {
                            color: 'rgba(156, 163, 175, 0.2)',
                            drawBorder: false,
                            lineWidth: 1
                        },
                        ticks: {
                            callback: function(value, index) {
                                const year = index;
                                const age = data.currentAge + year;
                                
                                if (year % 5 === 0 || year === results.yearsToRetirement) {
                                    return [`Year ${year}`, `Age ${age}`];
                                }
                                return year % 2 === 0 ? `${year}` : '';
                            },
                            maxRotation: 0,
                            color: '#6B7280',
                            font: {
                                size: 12,
                                family: 'system-ui, -apple-system, sans-serif'
                            },
                            padding: 10
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: `💰 Amount (${this.currencyConfig[this.currentCurrency].symbol})`,
                            font: {
                                size: 18,
                                weight: 'bold',
                                family: 'system-ui, -apple-system, sans-serif'
                            },
                            color: '#374151',
                            padding: 20
                        },
                        grid: {
                            color: 'rgba(156, 163, 175, 0.15)',
                            drawBorder: false,
                            lineWidth: 1
                        },
                        ticks: {
                            callback: (value) => {
                                return this.formatCurrency(value);
                            },
                            color: '#6B7280',
                            font: {
                                size: 13,
                                family: 'system-ui, -apple-system, sans-serif'
                            },
                            padding: 10,
                            maxTicksLimit: 10
                        },
                        beginAtZero: true
                    }
                },
                elements: {
                    point: {
                        hoverBackgroundColor: '#ffffff',
                        hoverBorderWidth: 4,
                        radius: 5,
                        hitRadius: 10
                    },
                    line: {
                        borderJoinStyle: 'round',
                        borderCapStyle: 'round'
                    }
                },
                animation: {
                    duration: 1800,
                    easing: 'easeInOutCubic'
                }
            }
        });
    }

    downloadChart() {
        if (!this.chart) {
            console.warn('Please calculate your retirement plan first to download the chart.');
            return;
        }

        try {
            const canvas = document.getElementById('savingsChart');
            const url = canvas.toDataURL('image/png', 1.0);
            
            const link = document.createElement('a');
            link.download = `retirement-savings-chart-${new Date().toISOString().split('T')[0]}.png`;
            link.href = url;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('Chart downloaded successfully!');
        } catch (error) {
            console.error('Download error:', error);
            this.showToast('Error downloading chart. Please try again.', 'error');
        }
    }

    downloadFullscreenChart() {
        if (!this.fullscreenChart) {
            console.warn('Chart not available for download.');
            return;
        }

        try {
            const canvas = document.getElementById('fullscreenChart');
            const url = canvas.toDataURL('image/png', 1.0);
            
            const link = document.createElement('a');
            link.download = `retirement-savings-chart-fullscreen-${new Date().toISOString().split('T')[0]}.png`;
            link.href = url;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('Full-screen chart downloaded successfully!');
        } catch (error) {
            console.error('Download error:', error);
            console.error('Error downloading chart. Please try again.');
        }
    }
}

// Initialize calculator and page navigation
document.addEventListener('DOMContentLoaded', function() {
    try {
        const calculator = new RetirementCalculator();
        showPage('page-input');
        console.log('Retirement Calculator initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Retirement Calculator:', error);
        console.error('Failed to initialize the calculator. Please refresh the page.');
    }
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    console.error('An error occurred. Please check the console for details.');
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});