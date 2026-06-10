/**
 * 功能3：动态定投计算器
 * 策略A: PE估值法 — 基准PE / 当前PE × 基准金额
 * 策略B: 均线偏离法 — 基准金额 × (1 - 偏离度 × 倍数)
 */

function runDynamicDCA(input) {
    const { freq, baseAmount, strategy, currentPE, referencePE, currentPrice, referenceMA, multiplier, minPct, maxPct, peMode } = input;
    const base = Number(baseAmount);

    let ratio = 1;
    let reason = '';
    let peRangeLabel = '';
    let peRangeCoeff = 0;

    // 频率说明
    const freqMap = { '每日': '天', '每周': '周', '每月': '月' };
    const freqUnit = freqMap[freq] || '月';

    if (strategy === 'pe') {
        const curPE = Number(currentPE);
        const refPE = Number(referencePE);

        if (!curPE || curPE <= 0) {
            return {
                show: true,
                suggested: '请输入有效的PE值',
                baseDisplay: this ? '' : '',
                change: 0,
                changeDisplay: '—',
                reason: 'PE必须为正数'
            };
        }

        if (peMode === 'range') {
            // 区间模式：按PE所在区间查表
            const ranges = [
                { max: Infinity, min: 35, label: '严重高估', coeff: 0.5 },
                { max: 35, min: 30, label: '偏高估', coeff: 0.8 },
                { max: 30, min: 23, label: '估值合理', coeff: 1.0 },
                { max: 23, min: 18, label: '偏低估', coeff: 1.3 },
                { max: 18, min: 0, label: '严重低估', coeff: 1.8 },
            ];
            const match = ranges.find(r => curPE > r.min && curPE <= r.max) || ranges[ranges.length - 1];
            ratio = match.coeff;
            peRangeLabel = match.label;
            peRangeCoeff = match.coeff;
            reason = `当前PE=${curPE}，处于【${match.label}】区间，调整系数=${match.coeff}`;
            if (match.coeff < 1) {
                reason += ' → 市场偏贵，减少定投金额';
            } else if (match.coeff > 1) {
                reason += ' → 市场偏便宜，增加定投金额';
            } else {
                reason += ' → PE在合理区间，保持基准定投';
            }
        } else {
            // 标准模式：参考PE / 当前PE
            if (!refPE || refPE <= 0) {
                return {
                    show: true,
                    suggested: '请输入有效的参考PE',
                    baseDisplay: this ? '' : '',
                    change: 0,
                    changeDisplay: '—',
                    reason: '参考PE必须为正数'
                };
            }
            ratio = refPE / curPE;
            reason = `当前PE=${curPE}，参考PE=${refPE}，调整比例=${refPE}/${curPE}=${ratio.toFixed(2)}`;
            if (curPE < refPE) {
                reason += ' → PE低于参考值，市场相对便宜，建议多买';
            } else {
                reason += ' → PE高于参考值，市场相对偏贵，建议少买';
            }
        }

    } else {
        // 均线偏离法
        const curP = Number(currentPrice);
        const refMA = Number(referenceMA);
        const mult = Number(multiplier) || 2;

        if (!curP || !refMA || refMA <= 0) {
            return {
                show: true,
                suggested: '请输入有效的指数点位和均线',
                baseDisplay: '',
                change: 0,
                changeDisplay: '—',
                reason: '指数点位和均线必须为正数'
            };
        }

        const deviation = (curP - refMA) / refMA;
        ratio = 1 - deviation * mult;

        const direction = deviation < 0 ? '低于' : '高于';
        reason = `当前=${curP}，${direction}均线=${refMA}，偏离度=${(deviation * 100).toFixed(1)}%，倍数=${mult}`;
        if (deviation < 0) {
            reason += ' → 指数在均线以下，市场偏弱，建议多买';
        } else {
            reason += ' → 指数在均线以上，市场偏强，建议少买';
        }
    }

    // 应用上下限
    const minRatio = Number(minPct) || 0.5;
    const maxRatio = Number(maxPct) || 2;
    const clampedRatio = Math.max(minRatio, Math.min(maxRatio, ratio));

    const suggestedAmt = Math.round(base * clampedRatio);
    const change = suggestedAmt - base;
    const changePct = Math.round((clampedRatio - 1) * 100);
    const sign = change >= 0 ? '+' : '';

    // 模拟对比数据（构建一个简单的回溯模拟）
    const simData = generateSimulationData(strategy, base, clampedRatio);

    const result = {
        show: true,
        suggested: '¥' + suggestedAmt.toLocaleString('zh-CN') + '/每' + freqUnit,
        baseDisplay: '¥' + base.toLocaleString('zh-CN') + '/每' + freqUnit,
        change: change,
        changeDisplay: sign + changePct + '% (' + sign + '¥' + change + ')',
        reason,
        ratio: clampedRatio,
        simData
    };

    // 区间模式额外返回区间信息
    if (peMode === 'range') {
        result.peRangeLabel = peRangeLabel;
        result.peRangeCoeff = peRangeCoeff;
    }

    return result;
}

/** 生成模拟数据用于图表展示 */
function generateSimulationData(strategy, base, ratio) {
    // 生成12期的模拟数据
    // 普通定投线：固定base
    // 动态定投线：在ratio附近随机变化
    const data = [];
    let normalTotal = 0;
    let dynaTotal = 0;

    for (let i = 1; i <= 12; i++) {
        normalTotal += base;

        // 模拟动态调整的ratio在0.5~2之间波动
        const variance = 0.3 * Math.sin(i * 0.8) + 0.2 * Math.cos(i * 0.5);
        const dynamicRatio = Math.max(0.5, Math.min(2, ratio + variance));
        const dynaAmt = Math.round(base * dynamicRatio);
        dynaTotal += dynaAmt;

        data.push({
            period: '第' + i + '期',
            normal: Math.round(normalTotal),
            dynamic: Math.round(dynaTotal)
        });
    }

    return data;
}

function renderDynaChart(canvas, result) {
    if (!canvas || !result.simData) return;
    const ctx = canvas.getContext('2d');

    if (window._dynaChart) {
        window._dynaChart.destroy();
        window._dynaChart = null;
    }

    const data = result.simData;
    const labels = data.map(d => d.period);

    window._dynaChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: '普通定投（固定金额）',
                    data: data.map(d => d.normal),
                    borderColor: '#94a3b8',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.3,
                    pointRadius: 2,
                },
                {
                    label: '动态定投（智能调整）',
                    data: data.map(d => d.dynamic),
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
                    ticks: { font: { size: 10 } },
                    grid: { display: false }
                },
                y: {
                    ticks: {
                        font: { size: 10 },
                        callback: function(v) { return '¥' + (v / 10000).toFixed(1) + '万'; }
                    },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                }
            }
        }
    });
}
