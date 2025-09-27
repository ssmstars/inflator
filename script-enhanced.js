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
            'post-retirement-roi': 'Expected annual return during retirement. Usually lower (3-6%) for more conservative investments.',
            'current-savings': 'Your current retirement savings or investment balance.'
        };
        
        this.initializeEventListeners();
        this.initializePopupSystem();
        this.loadExchangeRates();
        this.performInitialCalculation();
    }

    initializePopupSystem() {
        // Initialize popup overlay
        this.popupOverlay = document.getElementById('popup-overlay');
        this.popupModal = document.getElementById('popup-modal');
        this.popupTitle = document.getElementById('popup-title');
        this.popupBody = document.getElementById('popup-body');
        this.popupConfirm = document.getElementById('popup-confirm');
        this.popupCancel = document.getElementById('popup-cancel');
        this.popupClose = document.getElementById('popup-close');

        // Initialize loading overlay
        this.loadingOverlay = document.getElementById('loading-overlay');

        // Initialize toast container
        this.toastContainer = document.getElementById('toast-container');

        // Add event listeners
        this.popupClose.addEventListener('click', () => this.hidePopup());
        this.popupCancel.addEventListener('click', () => this.hidePopup());
        this.popupOverlay.addEventListener('click', (e) => {
            if (e.target === this.popupOverlay) {
                this.hidePopup();
            }
        });

        // ESC key to close popup
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.popupOverlay.classList.contains('show')) {
                this.hidePopup();
            }
        });
    }

    showPopup(title, content, type = 'info', confirmCallback = null) {
        this.popupTitle.textContent = title;
        this.popupBody.innerHTML = content;
        
        if (confirmCallback) {
            this.popupConfirm.style.display = 'inline-block';
            this.popupCancel.style.display = 'inline-block';
            this.popupConfirm.onclick = () => {
                confirmCallback();
                this.hidePopup();
            };
        } else {
            this.popupConfirm.style.display = 'inline-block';
            this.popupCancel.style.display = 'none';
            this.popupConfirm.onclick = () => this.hidePopup();
        }

        this.popupOverlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    hidePopup() {
        this.popupOverlay.classList.remove('show');
        document.body.style.overflow = '';
    }

    showLoading(message = 'Processing...') {
        document.querySelector('.loading-spinner p').textContent = message;
        this.loadingOverlay.classList.add('show');
    }

    hideLoading() {
        this.loadingOverlay.classList.remove('show');
    }

    showToast(message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 18px; cursor: pointer; padding: 0 0 0 10px;">&times;</button>
            </div>
        `;
        
        this.toastContainer.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    async loadExchangeRates() {
        try {
            this.showExchangeRateLoading();
            
            // Try multiple APIs for better reliability
            let data;
            try {
                const response = await fetch('https://api.exchangerate-api.com/v4/latest/INR');
                if (!response.ok) throw new Error('Primary API failed');
                data = await response.json();
            } catch (error) {
                // Fallback to another API
                try {
                    const response = await fetch('https://api.fixer.io/latest?base=INR&access_key=YOUR_API_KEY');
                    if (!response.ok) throw new Error('Fallback API failed');
                    data = await response.json();
                } catch (fallbackError) {
                    throw new Error('All APIs failed');
                }
            }
            
            this.exchangeRates = data.rates || data;
            this.updateExchangeRateDisplay();
            
        } catch (error) {
            console.error('Error loading exchange rates:', error);
            this.showExchangeRateError();
            // Enhanced fallback rates with more accuracy
            this.exchangeRates = {
                'USD': 0.012,
                'EUR': 0.011,
                'GBP': 0.0095,
                'JPY': 1.75,
                'CAD': 0.0165,
                'AUD': 0.0185,
                'SGD': 0.0162,
                'INR': 1
            };
            this.updateExchangeRateDisplay();
            this.showToast('Using approximate exchange rates', 'warning');
        }
    }

    showExchangeRateLoading() {
        this.exchangeRateInfo.innerHTML = '🔄 Loading exchange rates...';
        this.exchangeRateInfo.className = 'exchange-rate-info exchange-rate-loading';
    }

    showExchangeRateError() {
        this.exchangeRateInfo.innerHTML = '⚠️ Using approximate exchange rates';
        this.exchangeRateInfo.className = 'exchange-rate-info exchange-rate-error';
    }

    updateExchangeRateDisplay() {
        const selectedCurrency = this.currencySelect.value;
        if (selectedCurrency === 'INR') {
            this.exchangeRateInfo.innerHTML = '📊 Base currency - All calculations in INR';
        } else {
            const rate = this.exchangeRates[selectedCurrency];
            if (rate) {
                this.exchangeRateInfo.innerHTML = `📈 1 INR = ${rate.toFixed(4)} ${selectedCurrency} | Last updated: ${new Date().toLocaleTimeString()}`;
            }
        }
        this.exchangeRateInfo.className = 'exchange-rate-info';
    }

    initializeEventListeners() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.calculateRetirement();
        });

        // Currency change listener
        this.currencySelect.addEventListener('change', () => {
            this.handleCurrencyChange();
        });

        // Info icon listeners
        document.querySelectorAll('.info-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                const infoType = e.target.getAttribute('data-info');
                const helpText = this.helpTexts[infoType] || 'No help available for this field.';
                this.showPopup('Field Information', `<p>${helpText}</p>`);
            });
        });

        // Export and save buttons
        document.getElementById('export-results')?.addEventListener('click', () => {
            this.exportResults();
        });

        document.getElementById('save-scenario')?.addEventListener('click', () => {
            this.saveScenario();
        });

        // Real-time calculation on input change
        const inputs = this.form.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.debounce(() => this.calculateRetirement(), 500)();
            });

            // Add input validation
            input.addEventListener('blur', () => {
                this.validateInput(input);
            });
        });

        // Enhanced keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.calculateRetirement();
            }
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveScenario();
            }
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                this.exportResults();
            }
        });

        // Refresh exchange rates every 5 minutes
        setInterval(() => {
            this.loadExchangeRates();
        }, 300000);
    }

    validateInput(input) {
        const value = parseFloat(input.value);
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        
        let isValid = true;
        let errorMessage = '';

        if (isNaN(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid number';
        } else if (!isNaN(min) && value < min) {
            isValid = false;
            errorMessage = `Value must be at least ${min}`;
        } else if (!isNaN(max) && value > max) {
            isValid = false;
            errorMessage = `Value must be no more than ${max}`;
        }

        // Visual feedback
        if (isValid) {
            input.style.borderColor = '#e2e8f0';
            input.title = '';
        } else {
            input.style.borderColor = '#e53e3e';
            input.title = errorMessage;
        }

        return isValid;
    }

    handleCurrencyChange() {
        const newCurrency = this.currencySelect.value;
        const oldCurrency = this.currentCurrency;
        
        this.showLoading('Converting currencies...');
        
        // Convert existing values
        this.convertFormValues(oldCurrency, newCurrency);
        
        // Update currency units in the form
        this.updateCurrencyUnits(newCurrency);
        
        // Update current currency
        this.currentCurrency = newCurrency;
        
        // Update exchange rate display
        this.updateExchangeRateDisplay();
        
        // Recalculate with new currency
        setTimeout(() => {
            this.calculateRetirement();
            this.hideLoading();
            this.showToast(`Currency changed to ${this.currencyConfig[newCurrency].name}`, 'success');
        }, 500);
    }

    convertFormValues(fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) return;
        
        const monthlyIncomeInput = document.getElementById('monthlyIncome');
        const currentSavingsInput = document.getElementById('currentSavings');
        
        try {
            const conversionRate = this.getConversionRate(fromCurrency, toCurrency);
            
            // Convert and round appropriately
            const newIncome = Math.round(parseFloat(monthlyIncomeInput.value) * conversionRate);
            const newSavings = Math.round(parseFloat(currentSavingsInput.value || 0) * conversionRate);
            
            monthlyIncomeInput.value = newIncome;
            currentSavingsInput.value = newSavings;
            
            // Update step values
            const config = this.currencyConfig[toCurrency];
            monthlyIncomeInput.step = config.step;
            currentSavingsInput.step = config.step;
        } catch (error) {
            console.error('Currency conversion error:', error);
            this.showToast('Error converting currencies', 'error');
        }
    }

    getConversionRate(fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) return 1;
        
        // Enhanced error handling for exchange rates
        try {
            const fromRate = fromCurrency === 'INR' ? 1 : (1 / this.exchangeRates[fromCurrency]);
            const toRate = toCurrency === 'INR' ? 1 : this.exchangeRates[toCurrency];
            
            if (!fromRate || !toRate || isNaN(fromRate) || isNaN(toRate)) {
                throw new Error(`Invalid exchange rate for ${fromCurrency} to ${toCurrency}`);
            }
            
            return fromRate * toRate;
        } catch (error) {
            console.error('Conversion rate error:', error);
            return 1; // Fallback to 1:1 ratio
        }
    }

    updateCurrencyUnits(currency) {
        const config = this.currencyConfig[currency];
        const monthlyIncomeUnit = document.getElementById('monthlyIncomeUnit');
        const currentSavingsUnit = document.getElementById('currentSavingsUnit');
        
        if (monthlyIncomeUnit) monthlyIncomeUnit.textContent = config.symbol;
        if (currentSavingsUnit) currentSavingsUnit.textContent = config.symbol;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    performInitialCalculation() {
        this.calculateRetirement();
    }

    getFormData() {
        return {
            currentAge: parseInt(document.getElementById('currentAge').value),
            retirementAge: parseInt(document.getElementById('retirementAge').value),
            lifeExpectancy: parseInt(document.getElementById('lifeExpectancy').value),
            monthlyIncome: parseFloat(document.getElementById('monthlyIncome').value),
            inflationRate: parseFloat(document.getElementById('inflationRate').value) / 100,
            preRetirementROI: parseFloat(document.getElementById('preRetirementROI').value) / 100,
            postRetirementROI: parseFloat(document.getElementById('postRetirementROI').value) / 100,
            currentSavings: parseFloat(document.getElementById('currentSavings').value) || 0
        };
    }

    validateInputs(data) {
        const errors = [];

        // Enhanced validation
        if (data.currentAge < 18 || data.currentAge > 100) {
            errors.push('Current age must be between 18 and 100');
        }

        if (data.retirementAge <= data.currentAge) {
            errors.push('Retirement age must be greater than current age');
        }

        if (data.lifeExpectancy <= data.retirementAge) {
            errors.push('Life expectancy must be greater than retirement age');
        }

        if (data.monthlyIncome <= 0) {
            errors.push('Monthly income must be greater than 0');
        }

        if (data.inflationRate < 0 || data.inflationRate > 0.5) {
            errors.push('Inflation rate should be between 0% and 50%');
        }

        if (data.preRetirementROI < 0 || data.preRetirementROI > 0.5) {
            errors.push('Pre-retirement ROI should be between 0% and 50%');
        }

        if (data.postRetirementROI < 0 || data.postRetirementROI > 0.5) {
            errors.push('Post-retirement ROI should be between 0% and 50%');
        }

        if (errors.length > 0) {
            this.showPopup('Input Validation Errors', '<ul><li>' + errors.join('</li><li>') + '</li></ul>');
            return false;
        }

        return true;
    }

    calculateRetirement() {
        const data = this.getFormData();

        if (!this.validateInputs(data)) {
            return;
        }

        try {
            // Show loading
            this.showLoading('Calculating your retirement plan...');

            // Perform calculations
            const results = this.performCalculations(data);

            // Update UI with results
            setTimeout(() => {
                this.updateResults(results);
                this.updateBreakdown(data, results);
                this.updateChart(data, results);
                this.hideLoading();
            }, 800); // Simulate processing time for better UX

        } catch (error) {
            console.error('Calculation error:', error);
            this.hideLoading();
            this.showPopup('Calculation Error', 'An error occurred during calculation. Please check your inputs and try again.');
            this.showToast('Calculation failed', 'error');
        }
    }

    performCalculations(data) {
        // Enhanced calculations with better error handling
        const yearsToRetirement = data.retirementAge - data.currentAge;
        const yearsInRetirement = data.lifeExpectancy - data.retirementAge;
        
        if (yearsToRetirement <= 0 || yearsInRetirement <= 0) {
            throw new Error('Invalid time periods calculated');
        }

        // Calculate inflation-adjusted annual income needed at retirement
        const annualIncomeNeeded = data.monthlyIncome * 12 * Math.pow(1 + data.inflationRate, yearsToRetirement);
        
        // Calculate present value of retirement needs
        const realReturnRate = (data.postRetirementROI - data.inflationRate) / (1 + data.inflationRate);
        const totalFundsRequired = this.calculatePresentValue(annualIncomeNeeded, realReturnRate, yearsInRetirement);
        
        // Calculate future value of current savings
        const currentSavingsFuture = data.currentSavings * Math.pow(1 + data.preRetirementROI, yearsToRetirement);
        
        // Calculate additional funds needed
        const additionalFundsNeeded = Math.max(0, totalFundsRequired - currentSavingsFuture);
        
        // Calculate monthly savings needed
        const monthlySavings = this.calculateMonthlySavings(
            additionalFundsNeeded, 
            data.preRetirementROI, 
            yearsToRetirement
        );

        // Calculate total savings at retirement (corrected formula)
        const monthlyContributionFV = monthlySavings > 0 ? 
            monthlySavings * this.futureValueAnnuityFactor(data.preRetirementROI / 12, yearsToRetirement * 12) : 0;
        const totalSavingsAtRetirement = currentSavingsFuture + monthlyContributionFV;

        return {
            yearsToRetirement,
            yearsInRetirement,
            annualIncomeNeeded,
            totalFundsRequired,
            currentSavingsFuture,
            additionalFundsNeeded,
            monthlySavings,
            totalSavingsAtRetirement
        };
    }

    calculatePresentValue(annualPayment, rate, years) {
        if (Math.abs(rate) < 0.0001) { // Handle near-zero rates
            return annualPayment * years;
        }
        return annualPayment * (1 - Math.pow(1 + rate, -years)) / rate;
    }

    calculateMonthlySavings(futureValue, annualRate, years) {
        if (years === 0 || futureValue === 0) return 0;
        
        const monthlyRate = annualRate / 12;
        const totalMonths = years * 12;
        
        if (Math.abs(monthlyRate) < 0.0001) { // Handle near-zero rates
            return futureValue / totalMonths;
        }
        
        return futureValue * monthlyRate / (Math.pow(1 + monthlyRate, totalMonths) - 1);
    }

    futureValueAnnuityFactor(rate, periods) {
        if (Math.abs(rate) < 0.0001) return periods;
        return (Math.pow(1 + rate, periods) - 1) / rate;
    }

    updateResults(results) {
        const elements = {
            'yearsToRetirement': results.yearsToRetirement + ' years',
            'yearsInRetirement': results.yearsInRetirement + ' years',
            'annualIncomeNeeded': this.formatCurrency(results.annualIncomeNeeded),
            'totalFundsRequired': this.formatCurrency(results.totalFundsRequired),
            'currentSavingsFuture': this.formatCurrency(results.currentSavingsFuture),
            'additionalFundsNeeded': this.formatCurrency(results.additionalFundsNeeded),
            'monthlySavings': this.formatCurrency(results.monthlySavings),
            'totalSavingsAtRetirement': this.formatCurrency(results.totalSavingsAtRetirement)
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                // Enhanced animation
                const card = element.closest('.result-card');
                if (card) {
                    card.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        card.style.transform = 'scale(1)';
                        card.style.transition = 'transform 0.3s ease';
                    }, 100);
                }
            }
        });
    }

    updateBreakdown(data, results) {
        const breakdown = document.getElementById('calculationBreakdown');
        
        const breakdownHTML = `
            <p><strong>Planning Period:</strong> ${results.yearsToRetirement} years to save, ${results.yearsInRetirement} years in retirement</p>
            <p><strong>Current Monthly Need:</strong> ${this.formatCurrency(data.monthlyIncome)} (today's ${this.currencyConfig[this.currentCurrency].name.toLowerCase()})</p>
            <p><strong>Inflation Impact:</strong> ${(data.inflationRate * 100).toFixed(1)}% annually over ${results.yearsToRetirement} years</p>
            <p><strong>Future Monthly Need:</strong> ${this.formatCurrency(results.annualIncomeNeeded / 12)} (at retirement)</p>
            <p><strong>Investment Growth:</strong> ${(data.preRetirementROI * 100).toFixed(1)}% pre-retirement, ${(data.postRetirementROI * 100).toFixed(1)}% post-retirement</p>
            <p><strong>Current Savings Projection:</strong> ${this.formatCurrency(data.currentSavings)} → ${this.formatCurrency(results.currentSavingsFuture)}</p>
            ${results.additionalFundsNeeded > 0 ? 
                `<p><strong>Monthly Savings Target:</strong> ${this.formatCurrency(results.monthlySavings)} to bridge the gap of ${this.formatCurrency(results.additionalFundsNeeded)}</p>` : 
                '<p><strong>🎉 Great News!</strong> Your current savings are sufficient for your retirement goals!</p>'
            }
        `;
        
        breakdown.innerHTML = breakdownHTML;
    }

    updateChart(data, results) {
        const ctx = document.getElementById('savingsChart').getContext('2d');
        
        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }

        // Generate enhanced chart data
        const chartData = this.generateChartData(data, results);

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [
                    {
                        label: 'Current Savings Growth',
                        data: chartData.currentSavingsData,
                        borderColor: '#48bb78',
                        backgroundColor: 'rgba(72, 187, 120, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'Monthly Contributions',
                        data: chartData.monthlyContributionsData,
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'Total Savings',
                        data: chartData.totalSavingsData,
                        borderColor: '#764ba2',
                        backgroundColor: 'rgba(118, 75, 162, 0.1)',
                        borderWidth: 4,
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Retirement Savings Projection',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => {
                                return `${context.dataset.label}: ${this.formatCurrency(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => {
                                const curr = this.currentCurrency;
                                const config = this.currencyConfig[curr];
                                let convertedValue = value;
                                
                                if (curr !== 'INR') {
                                    convertedValue = value * (this.exchangeRates[curr] || 1);
                                }
                                
                                if (curr === 'INR') {
                                    return config.symbol + (convertedValue / 10000000).toFixed(1) + ' Cr';
                                } else if (curr === 'JPY') {
                                    return config.symbol + (convertedValue / 1000000).toFixed(0) + 'M';
                                } else {
                                    return config.symbol + (convertedValue / 1000000).toFixed(1) + 'M';
                                }
                            }
                        },
                        title: {
                            display: true,
                            text: `Amount (${this.currencyConfig[this.currentCurrency].name})`
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Age'
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    point: {
                        radius: 4,
                        hoverRadius: 8
                    }
                }
            }
        });
    }

    generateChartData(data, results) {
        const labels = [];
        const currentSavingsData = [];
        const monthlyContributionsData = [];
        const totalSavingsData = [];

        // Generate data points from current age to retirement
        for (let age = data.currentAge; age <= data.retirementAge; age++) {
            const yearsFromNow = age - data.currentAge;
            
            labels.push(age);
            
            // Current savings growth
            const currentSavingsValue = data.currentSavings * Math.pow(1 + data.preRetirementROI, yearsFromNow);
            currentSavingsData.push(currentSavingsValue);
            
            // Monthly contributions growth
            let monthlyContributionsValue = 0;
            if (yearsFromNow > 0 && results.monthlySavings > 0) {
                const monthsInvested = yearsFromNow * 12;
                const monthlyRate = data.preRetirementROI / 12;
                if (Math.abs(monthlyRate) < 0.0001) {
                    monthlyContributionsValue = results.monthlySavings * monthsInvested;
                } else {
                    monthlyContributionsValue = results.monthlySavings * 
                        ((Math.pow(1 + monthlyRate, monthsInvested) - 1) / monthlyRate);
                }
            }
            monthlyContributionsData.push(monthlyContributionsValue);
            
            // Total savings
            totalSavingsData.push(currentSavingsValue + monthlyContributionsValue);
        }

        return {
            labels,
            currentSavingsData,
            monthlyContributionsData,
            totalSavingsData
        };
    }

    formatCurrency(amount, currency = null) {
        const curr = currency || this.currentCurrency;
        const config = this.currencyConfig[curr];
        
        // Handle invalid amounts
        if (isNaN(amount) || amount === null || amount === undefined) {
            return config.symbol + '0';
        }
        
        // Convert amount to selected currency if needed
        let convertedAmount = amount;
        if (curr !== 'INR' && this.exchangeRates[curr]) {
            convertedAmount = amount * this.exchangeRates[curr];
        }
        
        // Format based on currency
        if (curr === 'INR') {
            if (convertedAmount >= 10000000) { // 1 crore
                return config.symbol + (convertedAmount / 10000000).toFixed(2) + ' Cr';
            } else if (convertedAmount >= 100000) { // 1 lakh
                return config.symbol + (convertedAmount / 100000).toFixed(2) + ' L';
            } else if (convertedAmount >= 1000) {
                return config.symbol + (convertedAmount / 1000).toFixed(0) + 'K';
            }
        } else if (curr === 'JPY') {
            // Japanese Yen doesn't use decimal places
            if (convertedAmount >= 1000000) {
                return config.symbol + (convertedAmount / 1000000).toFixed(1) + 'M';
            } else if (convertedAmount >= 1000) {
                return config.symbol + (convertedAmount / 1000).toFixed(0) + 'K';
            }
            return config.symbol + Math.round(convertedAmount).toLocaleString('ja-JP');
        } else {
            // Other currencies
            if (convertedAmount >= 1000000) {
                return config.symbol + (convertedAmount / 1000000).toFixed(2) + 'M';
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
                    annualIncomeNeeded: this.formatCurrency(results.annualIncomeNeeded)
                }
            };

            // Create CSV content
            let csvContent = "Retirement Planning Results\\n\\n";
            csvContent += `Generated on: ${new Date().toLocaleDateString()}\\n`;
            csvContent += `Currency: ${this.currencyConfig[this.currentCurrency].name}\\n\\n`;
            
            csvContent += "INPUT PARAMETERS\\n";
            csvContent += `Current Age,${data.currentAge}\\n`;
            csvContent += `Retirement Age,${data.retirementAge}\\n`;
            csvContent += `Life Expectancy,${data.lifeExpectancy}\\n`;
            csvContent += `Monthly Income Need,${this.formatCurrency(data.monthlyIncome)}\\n`;
            csvContent += `Inflation Rate,${(data.inflationRate * 100).toFixed(1)}%\\n`;
            csvContent += `Pre-Retirement ROI,${(data.preRetirementROI * 100).toFixed(1)}%\\n`;
            csvContent += `Post-Retirement ROI,${(data.postRetirementROI * 100).toFixed(1)}%\\n`;
            csvContent += `Current Savings,${this.formatCurrency(data.currentSavings)}\\n\\n`;
            
            csvContent += "RESULTS\\n";
            csvContent += `Years to Retirement,${results.yearsToRetirement}\\n`;
            csvContent += `Years in Retirement,${results.yearsInRetirement}\\n`;
            csvContent += `Monthly Savings Required,${this.formatCurrency(results.monthlySavings)}\\n`;
            csvContent += `Total Funds Required,${this.formatCurrency(results.totalFundsRequired)}\\n`;
            csvContent += `Annual Income Needed,${this.formatCurrency(results.annualIncomeNeeded)}\\n`;
            
            // Download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `retirement_plan_${new Date().getTime()}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showToast('Results exported successfully!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('Failed to export results', 'error');
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
            
            this.showToast(`Scenario "${scenarioName}" saved successfully!`, 'success');
        } catch (error) {
            console.error('Save scenario error:', error);
            this.showToast('Failed to save scenario', 'error');
        }
    }
}

// Enhanced initialization with error handling
document.addEventListener('DOMContentLoaded', () => {
    try {
        new RetirementCalculator();
        console.log('Retirement Calculator initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Retirement Calculator:', error);
        
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fee; border: 2px solid #fcc; color: #c00; padding: 20px; border-radius: 8px; z-index: 9999;';
        errorDiv.innerHTML = '<h3>Application Error</h3><p>Failed to initialize the retirement calculator. Please refresh the page and try again.</p><button onclick="location.reload()">Reload Page</button>';
        document.body.appendChild(errorDiv);
    }
});

// Add global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Add unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});