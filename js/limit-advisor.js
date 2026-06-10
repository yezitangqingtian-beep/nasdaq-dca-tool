/**
 * 功能2：基金限购应对指南
 * 内置主流纳指QDII基金数据，提供限购解决方案
 */

window.FUND_DB = {
    '161130': { name: '易方达纳斯达克100联接A', fee: '0.60%/年', limit: 0, limitDesc: '暂停申购', size: '15亿' },
    '040046': { name: '华安纳斯达克100联接A', fee: '0.80%/年', limit: 10, limitDesc: '10元/日', size: '47亿' },
    '000834': { name: '大成纳斯达克100联接A', fee: '1.00%/年', limit: 50, limitDesc: '50元/日', size: '35亿' },
    '270042': { name: '广发纳斯达克100联接A', fee: '1.00%/年', limit: 10, limitDesc: '10元/日', size: '97亿' },
    '016452': { name: '南方纳斯达克100指数A', fee: '0.67%/年', limit: 200, limitDesc: '200元/日', size: '31亿' },
    '016532': { name: '嘉实纳斯达克100联接A', fee: '0.60%/年', limit: 100, limitDesc: '100元/日', size: '19亿' },
    '016055': { name: '博时纳斯达克100联接A', fee: '0.65%/年', limit: 100, limitDesc: '100元/日', size: '13亿' },
    '015299': { name: '华夏纳斯达克100联接A', fee: '0.80%/年', limit: 100, limitDesc: '100元/日', size: '3.2亿' },
};

function runLimitAdvisor(input, db) {
    const { selectedFund, monthlyGoal } = input;
    const fund = db[selectedFund];

    if (!fund) {
        return { show: true, type: 'warn', title: '未找到该基金', detail: '请从列表中选择一支基金', alternatives: [] };
    }

    const goal = Number(monthlyGoal);
    const limit = fund.limit;
    const monthlyCapacity = limit * 21; // 月均交易日约21天

    // 情况1: 暂停申购
    if (limit === 0) {
        const alts = getAlternatives(selectedFund, db);
        return {
            show: true,
            type: 'error',
            title: '⚠️ ' + fund.name + ' 已暂停申购',
            detail: '该基金目前暂停买入，暂时无法新增定投。建议赎回现有持仓，转入以下替代基金继续定投。',
            alternatives: alts
        };
    }

    // 情况2: 额度够用
    if (monthlyCapacity >= goal) {
        const dailyAmt = Math.ceil(goal / 21);
        return {
            show: true,
            type: 'ok',
            title: '✅ 当前额度够用',
            detail: fund.name + ' 每日限购 ' + fund.limit + ' 元，每月最多可买约 ' + monthlyCapacity + ' 元，完全覆盖你 ' + goal + ' 元/月的目标。<br><br>建议：<b>改为每日定投</b>，每天投 <b>' + dailyAmt + ' 元</b>，既满足额度要求，又能进一步摊低成本。',
            alternatives: []
        };
    }

    // 情况3: 额度不够
    if (monthlyCapacity < goal && monthlyCapacity > 0) {
        const deficit = goal - monthlyCapacity;
        const alts = getAlternatives(selectedFund, db);
        return {
            show: true,
            type: 'warn',
            title: '⚠️ 额度不足，差 ' + deficit.toFixed(0) + ' 元/月',
            detail: fund.name + ' 每月最多只能买 ' + monthlyCapacity + ' 元，离你 ' + goal + ' 元的目标还差 ' + deficit.toFixed(0) + ' 元。<br><br><b>方案一：拆分配置</b>——这支基金每天买够 ' + fund.limit + ' 元（约 ' + monthlyCapacity + ' 元/月），差额分配到另一支基金。<br><br><b>方案二：直接切换</b>——如果长期限购，建议切换到额度更宽、费率更低的替代基金。',
            alternatives: alts
        };
    }

    // 默认
    return { show: true, type: 'warn', title: '未能分析', detail: '请检查输入信息', alternatives: [] };
}

/** 根据当前基金推荐替代方案（按费率排序） */
function getAlternatives(excludeCode, db) {
    return Object.entries(db)
        .filter(([code]) => code !== excludeCode)
        .map(([code, info]) => ({ code, ...info }))
        .filter(f => f.limit > 0)  // 只推荐在申购的
        .sort((a, b) => {
            const feeA = parseFloat(a.fee);
            const feeB = parseFloat(b.fee);
            return feeA - feeB;  // 费率低的优先
        })
        .slice(0, 4);
}
