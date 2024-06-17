export function getDisplayNature(nature) {
    const natureMap = {
        'stability_asset': '안정성 자산',
        'investment_asset': '투자 자산',
        'real_estate_asset': '부동산 자산',
        'retirement_asset': '연금 자산',
        'other_asset': '기타 자산',
        'liability': '부채'
    };
    return natureMap[nature] || nature;
}

export function getCurrencySymbol() {
    const currency = document.getElementById('currency').value;
    switch (currency) {
        case 'USD':
            return '$';
        case 'EUR':
            return '€';
        case 'KRW':
        default:
            return '₩';
    }
}