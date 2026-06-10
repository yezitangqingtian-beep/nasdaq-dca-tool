/**
 * 功能4：基金费用计算器（定投版）
 * 基于定投频率和每期金额，逐年模拟申购/管理/托管/销售服务/赎回费
 * 支持A类/C类自动对比
 */

const FEE_DEFAULTS = {
    a: {
        label: 'A类',
        subscriptionRate: 0.0012,      // 申购费率（打折后0.12%）
        subscriptionRateOrig: 0.015,   // 原始申购费率1.5%
        managementRate: 0.006,         // 管理费0.6%/年
        custodyRate: 0.002,            // 托管费0.2%/年
        salesServiceRate: 0,           // 无销售服务费
        redemptionRate: 0.005,         // 赎回费0.5%
        redemptionFreeAfter: 1,        // 1年后免赎回费
    },
    c: {
        label: 'C类',
        subscriptionRate: 0,           // 免申购费
        subscriptionRateOrig: 0,
        managementRate: 0.006,         // 管理费0.6%/年
        custodyRate: 0.002,            // 托管费0.2%/年
        salesServiceRate: 0.004,       // 销售服务费0.4%/年
        redemptionRate: 0,             // 通常持有>7天免
        redemptionFreeAfter: 0.02,     // 约7天
    }
};

function runFeeCalc(input) {
    const { freq, amount, years, annualReturn, fundClass, rates } = input;
    const config = fundClass === 'a' ? rates.a : rates.c;
    const P = Number(amount);
    const N = Number(years);
    const grossReturn = Number(annualReturn) / 100;

    const freqMap = { '每日': 252, '每周': 52, '每月': 12 };
    const periodsPerYear = freqMap[freq] || 12;

    // 年度运营费率（管理+托管+销售服务）
    const annualFeeRate = config.managementRate + config.custodyRate + config.salesServiceRate;

    let balance = 0;
    let totalSubFees = 0;
    let totalAnnualFees = 0;
    let totalInvested = 0;
    let totalInvestedNet = 0;
    let totalReturns = 0;
    const yearly = [];

    for (let y = 1; y <= N; y++) {
        // 每年按期定投
        for (let p = 1; p <= periodsPerYear; p++) {
            const subFee = P * config.subscriptionRate;
            totalSubFees += subFee;
            balance += P - subFee;
            totalInvested += P;
            totalInvestedNet += P - subFee;
        }

        // 每年收益增长
        const yearReturn = balance * grossReturn;
        totalReturns += yearReturn;
        balance += yearReturn;

        // 扣除年度运营费（管理+托管+销售服务）
        const yearFee = balance * annualFeeRate;
        totalAnnualFees += yearFee;
        balance -= yearFee;

        yearly.push({
            year: y,
            invested: Math.round(totalInvested),
            balance: Math.round(balance),
            totalFeesSoFar: Math.round(totalSubFees + totalAnnualFees),
        });
    }

    // 赎回费
    let redemptionFee = 0;
    if (N < config.redemptionFreeAfter) {
        redemptionFee = balance * config.redemptionRate;
    }

    const finalValue = Math.round(balance - redemptionFee);
    const totalFees = Math.round(totalSubFees + totalAnnualFees + redemptionFee);
    const finalNoFee = Math.round(totalInvestedNet + totalReturns);
    const feeImpactPct = totalInvested > 0 ? (totalFees / (totalInvested + totalReturns) * 100).toFixed(1) : '0';

    // A/C 对比（基于定投模式）
    const comparison = compareAC_DCA(input, rates);

    return {
        show: true,
        fundClass: fundClass.toUpperCase(),
        summary: {
            totalInvested: Math.round(totalInvested),
            subscriptionFee: Math.round(totalSubFees),
            totalAnnualFees: Math.round(totalAnnualFees),
            redemptionFee: Math.round(redemptionFee),
            totalFees,
        },
        result: {
            finalValue,
            finalNoFee,
            feeImpact: totalFees,
            feeImpactPct,
        },
        yearly,
        comparison,
    };
}

/** A类 vs C类对比（定投版） */
function compareAC_DCA(input, rates) {
    const { freq, amount, years, annualReturn } = input;
    const P = Number(amount);
    const N = Number(years);
    const grossReturn = Number(annualReturn) / 100;

    const freqMap = { '每日': 252, '每周': 52, '每月': 12 };
    const ppy = freqMap[freq] || 12;

    function calcFinal(config) {
        let bal = 0;
        const annualFee = config.managementRate + config.custodyRate + config.salesServiceRate;
        for (let y = 1; y <= N; y++) {
            for (let p = 1; p <= ppy; p++) bal += P - P * config.subscriptionRate;
            bal = bal * (1 + grossReturn) - bal * annualFee;
        }
        let rf = 0;
        if (N < config.redemptionFreeAfter) rf = bal * config.redemptionRate;
        return Math.round(bal - rf);
    }

    const finalA = calcFinal(rates.a);
    const finalC = calcFinal(rates.c);
    const better = finalA >= finalC ? 'A' : 'C';
    const diff = Math.abs(finalA - finalC);
    const diffPct = (diff / (P * ppy * N) * 100).toFixed(1);

    // 寻找临界年限
    let breakEvenYear = null;
    for (let y = 1; y <= 20; y++) {
        function cf(config) {
            let bal = 0;
            const af = config.managementRate + config.custodyRate + config.salesServiceRate;
            for (let i = 1; i <= y; i++) {
                for (let p = 1; p <= ppy; p++) bal += P - P * config.subscriptionRate;
                bal = bal * (1 + grossReturn) - bal * af;
            }
            let rf = 0;
            if (y < config.redemptionFreeAfter) rf = bal * config.redemptionRate;
            return bal - rf;
        }
        if (cf(rates.a) >= cf(rates.c)) { breakEvenYear = y; break; }
    }

    return {
        finalA: finalA.toLocaleString('zh-CN'),
        finalC: finalC.toLocaleString('zh-CN'),
        better,
        diff: diff.toLocaleString('zh-CN'),
        diffPct,
        breakEvenYear,
        recommendation: getRecommendation(N, breakEvenYear),
    };
}

function getRecommendation(holdYears, breakEvenYear) {
    if (!breakEvenYear) return '长期持有建议选A类';
    if (holdYears < 1) return '短期持有（<1年）建议选C类，免申购赎回费';
    if (holdYears < breakEvenYear) {
        return `持有${holdYears}年建议选C类，费用更低；超过${breakEvenYear}年选A类更划算`;
    }
    return `持有${holdYears}年建议选A类，申购费一次性摊薄后比C类逐年收销售服务费更省`;
}
