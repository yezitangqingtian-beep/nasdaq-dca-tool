/**
 * 功能1：定投收益预测计算器
 * 支持每日/每周/每月定投的复利计算
 */

function runCalculator(input) {
    const { freq, amount, rate, years } = input;
    const annualRate = rate / 100;

    // 计算每期利率和总期数
    let periodsPerYear, periods;
    switch (freq) {
        case '每日': periodsPerYear = 252; break;  // A股年交易日
        case '每周': periodsPerYear = 52; break;
        case '每月': periodsPerYear = 12; break;
        default: periodsPerYear = 12;
    }
    periods = Math.round(years * periodsPerYear);
    const periodicRate = Math.pow(1 + annualRate, 1 / periodsPerYear) - 1;

    // 期末复利公式（每期初投入）
    // FV = P × (1+r) × [(1+r)^n - 1] / r
    const P = Number(amount);
    const r = periodicRate;
    const n = periods;

    // 逐年明细
    const table = [];
    let cumulativeInvested = 0;
    let prevEarning = 0;

    for (let y = 1; y <= years; y++) {
        const periodsThisYear = y * periodsPerYear;
        const investedThisYear = P * periodsPerYear;
        cumulativeInvested += investedThisYear;
        const totalValue = P * (1 + r) * (Math.pow(1 + r, periodsThisYear) - 1) / r;
        const totalEarning = totalValue - cumulativeInvested;
        const yearEarning = totalEarning - prevEarning;
        prevEarning = totalEarning;

        table.push({
            year: y,
            invested: cumulativeInvested,
            value: Math.round(totalValue),
            earning: Math.round(totalEarning),
            yearEarning: Math.round(yearEarning)
        });
    }

    const finalRow = table[table.length - 1];
    const totalInvested = finalRow.invested;
    const totalValue = finalRow.value;
    const totalEarnings = finalRow.earning;

    const freqLabel = freq;
    const monthlyText = `每月${(P * periodsPerYear / 12).toFixed(0)}元`;

    return {
        summary: `${years}年后（${freqLabel}定投${P}元，${monthlyText}，年化${rate}%）`,
        totalValue: '¥' + totalValue.toLocaleString('zh-CN'),
        totalInvested: '¥' + totalInvested.toLocaleString('zh-CN'),
        totalEarnings: '¥' + totalEarnings.toLocaleString('zh-CN'),
        totalValueNum: totalValue,
        totalInvestedNum: totalInvested,
        table
    };
}

function renderCalcChart(canvas, table) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // 销毁旧图表
    if (window._calcChart) {
        window._calcChart.destroy();
        window._calcChart = null;
    }

    const labels = table.map(r => '第' + r.year + '年');
    const investedData = table.map(r => r.invested);
    const valueData = table.map(r => r.value);

    window._calcChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: '投入本金',
                    data: investedData,
                    borderColor: '#94a3b8',
                    backgroundColor: 'rgba(148,163,184,0.1)',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.3,
                    pointRadius: 2,
                },
                {
                    label: '总价值',
                    data: valueData,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37,99,235,0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 2,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { boxWidth: 12, padding: 12, font: { size: 11 } }
                },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return ctx.dataset.label + ': ¥' + ctx.parsed.y.toLocaleString('zh-CN');
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { font: { size: 10 }, maxTicksLimit: 10 },
                    grid: { display: false }
                },
                y: {
                    ticks: {
                        font: { size: 10 },
                        callback: function(v) { return '¥' + (v / 10000).toFixed(0) + '万'; }
                    },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                }
            }
        }
    });
}
