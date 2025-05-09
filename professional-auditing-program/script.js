    document.addEventListener('DOMContentLoaded', () => {
    const billForm = document.getElementById('bill-form');
    const billsTableBody = document.querySelector('#bills-table tbody');
    const summaryText = document.getElementById('summary-text');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const summaryChartCtx = document.getElementById('summary-chart').getContext('2d');

    let bills = [];

    // Load bills from localStorage
    function loadBills() {
        // Start with empty bills list by default (ignore localStorage)
        bills = [];
    }

    // Save bills to localStorage
    function saveBills() {
        localStorage.setItem('bills', JSON.stringify(bills));
    }

    // Render bills table
    function renderBills() {
        billsTableBody.innerHTML = '';
        let totalPriceSum = 0;
        bills.forEach((bill, index) => {
            if (!bill || bill.initialBalance === undefined || bill.amountPaid === undefined) {
                console.warn('Skipping invalid bill entry at index', index, bill);
                return;
            }
            const balance = bill.initialBalance - bill.amountPaid;
            const tr = document.createElement('tr');

            const quantity = bill.initialBalance;
            const unitPrice = bill.amountPaid;
            const totalPrice = quantity * unitPrice;
            totalPriceSum += totalPrice;

            tr.innerHTML = `
                <td>${bill.accountName}</td>
                <td>${bill.category}</td>
                <td>${quantity}</td>
                <td>₱${unitPrice.toFixed(2)}</td>
                <td>₱${totalPrice.toFixed(2)}</td>
                <td><button data-index="${index}" class="delete-btn">Delete</button></td>
            `;

            billsTableBody.appendChild(tr);
        });

        // Update total price in footer
        const totalPriceElement = document.getElementById('total-price');
        if (totalPriceElement) {
            totalPriceElement.textContent = `₱${totalPriceSum.toFixed(2)}`;
        }

        // Update total items quantity in footer
        const totalItemsElement = document.getElementById('total-items');
        if (totalItemsElement) {
            const totalQuantity = bills.reduce((sum, bill) => {
                if (bill && bill.initialBalance !== undefined) {
                    return sum + bill.initialBalance;
                }
                return sum;
            }, 0);
            totalItemsElement.textContent = totalQuantity.toString();
        }

        // Attach delete event listeners
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.target.getAttribute('data-index');
                bills.splice(index, 1);
                saveBills();
                renderBills();
                updateSummary();
                updateChart();
            });
        });
    }

    // Update summary text
    function updateSummary() {
        const summaryTableBody = document.getElementById('summary-text');
        summaryTableBody.innerHTML = '';
    }

    // Prepare data for chart
    function getChartData() {
        const filteredBills = bills.filter(bill => {
            const category = bill.category ? bill.category.toLowerCase() : '';
            return category !== 'undefined' && category !== 'rent' && bill.initialBalance !== undefined && bill.initialBalance !== null;
        });
        const labels = filteredBills.map(bill => `${bill.accountName} (${bill.category})`);
        const dataPrice = filteredBills.map(bill => {
            const quantity = parseFloat(bill.initialBalance);
            const unitPrice = parseFloat(bill.amountPaid);
            if (isNaN(quantity) || isNaN(unitPrice)) return 0;
            return quantity * unitPrice;
        });
        const dataQuantity = filteredBills.map(bill => {
            const quantity = parseFloat(bill.initialBalance);
            if (isNaN(quantity)) return 0;
            return quantity;
        });
        return { labels, dataPrice, dataQuantity };
    }

    let summaryChart;

    // Update chart
    function updateChart() {
        const { labels, dataPrice, dataQuantity } = getChartData();

        if (summaryChart) {
            summaryChart.destroy();
        }

        // Generate distinct colors for each bill
        const backgroundColorsPrice = [];
        const backgroundColorsQuantity = [];
        const baseColors = [
            '#3498db', '#9b59b6', '#e67e22', '#2ecc71', '#e74c3c', '#1abc9c', '#f1c40f',
            '#8e44ad', '#d35400', '#27ae60', '#c0392b', '#16a085', '#f39c12', '#2980b9'
        ];
        for (let i = 0; i < dataPrice.length; i++) {
            backgroundColorsPrice.push(baseColors[i % baseColors.length]);
            // Use lighter colors for quantity
            backgroundColorsQuantity.push(baseColors[i % baseColors.length] + '80'); // add opacity
        }

        summaryChart = new Chart(summaryChartCtx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Price',
                    data: dataPrice,
                    backgroundColor: backgroundColorsPrice,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: function(context) {
                                const index = context.dataIndex;
                                const itemNameCategory = context.chart.data.labels[index];
                                const price = context.dataset.data[index];
                                // Access quantity from the second dataset if exists
                                let quantity = 'N/A';
                                // Try to get quantity from bills array matching label
                                if (index >= 0 && index < bills.length) {
                                    const bill = bills.find(b => `${b.accountName} (${b.category})` === context.chart.data.labels[index]);
                                    if (bill && bill.initialBalance !== undefined && bill.initialBalance !== null) {
                                        quantity = bill.initialBalance;
                                    }
                                }
                                return `${itemNameCategory}\nPrice: ₱${price.toFixed(2)}\nQuantity: ${quantity}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Export chart and bills list as one image
    async function exportChartAndBillsAsImage() {
        // Create a canvas to combine chart and bills list
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas width and height
        const chartCanvas = summaryChartCtx.canvas;
        const chartWidth = chartCanvas.width;
        const chartHeight = chartCanvas.height;
        const billsListHeight = 300; // height for bills list section
        canvas.width = chartWidth;
        canvas.height = chartHeight + billsListHeight;

        // Draw chart image on top
        const chartImage = new Image();
        chartImage.src = summaryChart.toBase64Image();
        await new Promise(resolve => {
            chartImage.onload = () => {
                ctx.drawImage(chartImage, 0, 0, chartWidth, chartHeight);

                // Draw bills list text below chart
                ctx.font = '14px Arial';
                ctx.fillStyle = '#000';
                ctx.textBaseline = 'top';

                // Header row
                const header = ['Account Name', 'Category', 'Initial Balance', 'Amount Paid', 'Balance'];
                const colWidths = [120, 100, 120, 100, 100];
                let x = 10;
                let y = chartHeight + 10;
                header.forEach((text, i) => {
                    ctx.fillText(text, x, y);
                    x += colWidths[i];
                });

                // Draw bills rows
                y += 20;
                bills.forEach(bill => {
                    if (!bill || bill.initialBalance === undefined || bill.amountPaid === undefined) {
                        return;
                    }
                    const totalPrice = bill.initialBalance * bill.amountPaid;
                    x = 10;
                    const row = [
                        bill.accountName,
                        bill.category,
                        bill.initialBalance.toString(),
                        bill.amountPaid.toFixed(2),
                        totalPrice.toFixed(2)
                    ];
                    row.forEach((text, i) => {
                        ctx.fillText(text, x, y);
                        x += colWidths[i];
                    });
                    y += 20;
                });

                resolve();
            };
        });

        // Create download link
        const link = document.createElement('a');
        link.download = 'bills_report.png';
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Add bill event
    billForm.addEventListener('submit', (e) => {
        console.log('Add Inventory Item button clicked');
        e.preventDefault();
        const itemName = document.getElementById('account-name').value.trim();
        const quantityInput = document.getElementById('initial-balance');
        const unitPriceInput = document.getElementById('amount-paid');
        const quantityRaw = quantityInput.value;
        const unitPriceRaw = unitPriceInput.value;
        const quantity = parseInt(quantityRaw, 10);
        const unitPrice = parseFloat(unitPriceRaw);
        const category = document.getElementById('bill-category').value;

        if (!itemName || isNaN(quantity) || isNaN(unitPrice) || !category) {
            alert('Please fill in all fields correctly.');
            return;
        }

        bills.push({ accountName: itemName, initialBalance: quantity, amountPaid: unitPrice, category: category });
        saveBills();
        renderBills();
        updateSummary();
        updateChart();

        billForm.reset();
        document.getElementById('bill-category').selectedIndex = 0;
        // Keep quantity input empty after reset
        quantityInput.value = '';
        unitPriceInput.value = '';
    });

    exportCsvBtn.addEventListener('click', (e) => {
        e.preventDefault();
        exportChartAndBillsAsImage();
    });

    // Initial load
    loadBills();
    renderBills();
    updateSummary();
    updateChart();
});
