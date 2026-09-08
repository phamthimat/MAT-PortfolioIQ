/* MAT PortfolioIQ
   Built by @phamthimat
   V3.3 Performance Ranking
*/

const BINANCE_API="https://api.binance.com/api/v3/ticker/24hr";

function addAsset(){
    const list=document.getElementById("assetList");
    const row=document.createElement("div");
    row.className="asset-row";
    row.innerHTML=`
        <input type="text" value="" class="asset" placeholder="Asset">
        <input type="number" value="0" class="percentage" min="0" max="100" step="0.1">
        <span>%</span>
        <button type="button" class="remove-btn" onclick="removeAsset(this)">×</button>
    `;
    list.appendChild(row);
    row.querySelector(".asset").focus();
}

function removeAsset(button){
    const rows=document.querySelectorAll(".asset-row");

    if(rows.length<=1){
        document.getElementById("message").innerText=
            "Your portfolio must contain at least one asset.";
        return;
    }

    button.parentElement.remove();
    document.getElementById("message").innerText="";
}

async function analyzePortfolio(){

    const assets=document.querySelectorAll(".asset");
    const percentages=document.querySelectorAll(".percentage");
    const portfolioValue=Number(
        document.getElementById("portfolioValue").value
    );

    let total=0;
    let largest=0;
    let largestAsset="";
    let validAssets=[];

    if(!Number.isFinite(portfolioValue)||portfolioValue<=0){
        document.getElementById("message").innerText=
            "Please enter a valid portfolio value.";
        return;
    }

    for(let i=0;i<percentages.length;i++){

        const value=Number(percentages[i].value);
        const asset=assets[i].value.trim().toUpperCase();

        if(value<0){
            document.getElementById("message").innerText=
                "Allocation cannot be negative.";
            document.getElementById("results").style.display="none";
            return;
        }

        total+=value;

        if(asset!==""&&value>0){
            validAssets.push({
                name:asset,
                value:value
            });
        }

        if(value>largest){
            largest=value;
            largestAsset=asset;
        }
    }

    if(validAssets.length===0){
        document.getElementById("message").innerText=
            "Please enter at least one crypto asset.";
        return;
    }

    if(Math.abs(total-100)>0.01){
        document.getElementById("message").innerText=
            "Portfolio allocation must equal 100%. Current total: "+
            total.toFixed(2)+"%";
        document.getElementById("results").style.display="none";
        return;
    }

    document.getElementById("message").innerText="";

    const assetCount=validAssets.length;

    let diversificationScore;

    if(assetCount===1) diversificationScore=20;
    else if(assetCount===2) diversificationScore=45;
    else if(assetCount===3) diversificationScore=65;
    else if(assetCount===4) diversificationScore=80;
    else if(assetCount===5) diversificationScore=88;
    else diversificationScore=95;

    let concentrationScore;

    if(largest>=80) concentrationScore=10;
    else if(largest>=70) concentrationScore=25;
    else if(largest>=60) concentrationScore=40;
    else if(largest>=50) concentrationScore=55;
    else if(largest>=40) concentrationScore=70;
    else if(largest>=30) concentrationScore=82;
    else concentrationScore=95;

    const idealAllocation=100/assetCount;
    const balanceDifference=Math.abs(largest-idealAllocation);

    let balanceScore;

    if(balanceDifference<=5) balanceScore=95;
    else if(balanceDifference<=10) balanceScore=85;
    else if(balanceDifference<=20) balanceScore=75;
    else if(balanceDifference<=30) balanceScore=60;
    else if(balanceDifference<=40) balanceScore=45;
    else balanceScore=30;

    let healthScore=Math.round(
        diversificationScore*0.40+
        concentrationScore*0.35+
        balanceScore*0.25
    );

    healthScore=Math.max(0,Math.min(100,healthScore));

    let riskLevel;

    if(largest>=60||healthScore<50) riskLevel="High";
    else if(largest>=40||healthScore<75) riskLevel="Medium";
    else riskLevel="Low";

    let healthLabel;

    if(healthScore>=85) healthLabel="Excellent";
    else if(healthScore>=75) healthLabel="Healthy";
    else if(healthScore>=60) healthLabel="Fair";
    else if(healthScore>=40) healthLabel="Needs Attention";
    else healthLabel="High Risk";

    document.getElementById("healthScore").innerText=healthScore;
    document.getElementById("healthLabel").innerText=healthLabel;
    document.getElementById("riskLevel").innerText=riskLevel;
    document.getElementById("diversification").innerText=
        diversificationScore+"/100";
    document.getElementById("largestPosition").innerText=
        largestAsset+" "+largest+"%";

    document.getElementById("diversificationScore").innerText=
        diversificationScore+"/100";
    document.getElementById("concentrationScore").innerText=
        concentrationScore+"/100";
    document.getElementById("balanceScore").innerText=
        balanceScore+"/100";

    document.getElementById("diversificationProgress").style.width=
        diversificationScore+"%";
    document.getElementById("concentrationProgress").style.width=
        concentrationScore+"%";
    document.getElementById("balanceProgress").style.width=
        balanceScore+"%";

    updateAllocationChart(validAssets);

    document.getElementById("results").style.display="block";

    document.getElementById("results").scrollIntoView({
        behavior:"smooth",
        block:"start"
    });

    document.getElementById("marketStatus").innerText="Loading...";

    document.getElementById("marketCards").innerHTML=
        "<div class='market-unavailable'>Fetching Binance market data...</div>";

    document.getElementById("portfolioImpact").innerText="--";
    document.getElementById("portfolioPnL").innerText="--";
    document.getElementById("topPerformer").innerText="--";
    document.getElementById("worstPerformer").innerText="--";
    document.getElementById("marketSignal").innerText="--";
    document.getElementById("dataCoverage").innerText="--";

    document.getElementById("displayPortfolioValue").innerText=
        formatMoney(portfolioValue);

    const marketData=await fetchMarketData(validAssets);

    displayMarketData(
        marketData,
        portfolioValue,
        healthScore,
        largestAsset,
        largest,
        assetCount
    );
}

async function fetchMarketData(assets){

    const results=[];

    for(const asset of assets){

        try{

            const symbol=asset.name+"USDT";

            const response=await fetch(
                BINANCE_API+
                "?symbol="+encodeURIComponent(symbol)
            );

            if(!response.ok) throw new Error("Unavailable");

            const data=await response.json();

            const price=Number(data.lastPrice);
            const change=Number(data.priceChangePercent);

            if(!Number.isFinite(price)||!Number.isFinite(change)){
                throw new Error("Invalid data");
            }

            results.push({
                name:asset.name,
                allocation:asset.value,
                price:price,
                change:change,
                contribution:(asset.value/100)*change,
                available:true
            });

        }catch(error){

            results.push({
                name:asset.name,
                allocation:asset.value,
                price:null,
                change:null,
                contribution:null,
                available:false
            });
        }
    }

    return results;
}

function displayMarketData(
    data,
    portfolioValue,
    healthScore,
    largestAsset,
    largest,
    assetCount
){

    const cards=document.getElementById("marketCards");
    cards.innerHTML="";

    const available=data.filter(item=>item.available);
    const unavailable=data.filter(item=>!item.available);

    data.forEach(item=>{

        const card=document.createElement("div");
        card.className="market-card";

        if(!item.available){

            card.innerHTML=`
                <div class="market-card-header">
                    <span class="market-symbol">
                        ${escapeHtml(item.name)}
                    </span>
                </div>
                <div class="market-unavailable">
                    Binance market pair unavailable
                </div>
            `;

        }else{

            const cls=item.change>=0
                ?"market-positive"
                :"market-negative";

            const sign=item.change>=0?"+":"";

            const contributionSign=
                item.contribution>=0?"+":"";

            card.innerHTML=`
                <div class="market-card-header">
                    <span class="market-symbol">
                        ${escapeHtml(item.name)}
                    </span>
                    <span>${item.allocation}%</span>
                </div>

                <div class="market-price">
                    ${formatPrice(item.price)} USDT
                </div>

                <div class="market-change ${cls}">
                    ${sign}${item.change.toFixed(2)}% 24h
                </div>

                <div style="margin-top:8px;color:#9ca3af;font-size:12px;">
                    Portfolio contribution:
                    <strong class="${cls}">
                        ${contributionSign}${item.contribution.toFixed(2)}%
                    </strong>
                </div>
            `;
        }

        cards.appendChild(card);
    });

    document.getElementById("marketStatus").innerText=
        available.length===data.length
            ?"Live"
            :available.length>0
                ?available.length+"/"+data.length+" assets"
                :"Unavailable";

    if(available.length===0){

        document.getElementById("portfolioImpact").innerText="Unavailable";
        document.getElementById("portfolioPnL").innerText="Unavailable";
        document.getElementById("topPerformer").innerText="Unavailable";
        document.getElementById("worstPerformer").innerText="Unavailable";
        document.getElementById("marketSignal").innerText="Unavailable";
        document.getElementById("dataCoverage").innerText="0%";

        document.getElementById("marketUpdated").innerText=
            "No Binance market data available.";

        generateAIInsight(
            healthScore,
            largestAsset,
            largest,
            assetCount,
            null
        );

        return;
    }

    let weightedChange=0;

    available.forEach(item=>{
        weightedChange+=item.contribution;
    });

    const estimatedPnL=
        portfolioValue*(weightedChange/100);

    const estimatedValue=
        portfolioValue+estimatedPnL;

    const impact=document.getElementById("portfolioImpact");

    impact.innerText=
        (weightedChange>=0?"+":"")+
        weightedChange.toFixed(2)+"%";

    impact.className=
        weightedChange>=0
            ?"market-positive"
            :"market-negative";

    const pnl=document.getElementById("portfolioPnL");

    pnl.innerText=
        (estimatedPnL>=0?"+":"")+
        formatMoney(estimatedPnL);

    pnl.className=
        estimatedPnL>=0
            ?"market-positive"
            :"market-negative";

    document.getElementById("estimatedValue").innerText=
        formatMoney(estimatedValue);

    let top=available[0];
    let worst=available[0];

    available.forEach(item=>{
        if(item.change>top.change) top=item;
        if(item.change<worst.change) worst=item;
    });

    document.getElementById("topPerformer").innerText=
        top.name+" "+
        (top.change>=0?"+":"")+
        top.change.toFixed(2)+"%";

    document.getElementById("worstPerformer").innerText=
        worst.name+" "+
        (worst.change>=0?"+":"")+
        worst.change.toFixed(2)+"%";

    const averageVolatility=
        available.reduce(
            (sum,item)=>sum+Math.abs(item.change),
            0
        )/available.length;

    let marketSignal;

    if(averageVolatility>=8) marketSignal="High Volatility";
    else if(averageVolatility>=4) marketSignal="Elevated";
    else marketSignal="Normal";

    document.getElementById("marketSignal").innerText=
        marketSignal;

    const coverage=
        Math.round((available.length/data.length)*100);

    document.getElementById("dataCoverage").innerText=
        coverage+"%";

    document.getElementById("marketUpdated").innerText=
        "Market data refreshed at "+
        new Date().toLocaleTimeString()+
        ". "+unavailable.length+
        " asset(s) unavailable.";

    generateAIInsight(
        healthScore,
        largestAsset,
        largest,
        assetCount,
        {
            weightedChange:weightedChange,
            estimatedPnL:estimatedPnL,
            estimatedValue:estimatedValue,
            top:top,
            worst:worst,
            marketSignal:marketSignal,
            available:available
        }
    );
}

function generateAIInsight(
    healthScore,
    largestAsset,
    largest,
    assetCount,
    market
){

    let insight="";

    if(largest>=70){

        insight=
            "⚠️ High concentration: "+
            largestAsset+
            " represents "+largest+
            "% of the portfolio.";

    }else if(largest>=60){

        insight=
            "⚠️ Concentration risk is high. "+
            largestAsset+
            " represents "+largest+
            "% of the portfolio.";

    }else if(largest>=40){

        insight=
            "⚠️ Moderate concentration: "+
            largestAsset+
            " represents "+largest+
            "% of the portfolio.";

    }else if(assetCount<=2){

        insight=
            "⚠️ Limited diversification with only "+
            assetCount+" assets.";

    }else if(healthScore>=85){

        insight=
            "✅ Strong portfolio structure with good diversification and balance.";

    }else if(healthScore>=75){

        insight=
            "✅ Healthy portfolio structure with relatively balanced allocation.";

    }else{

        insight=
            "⚠️ Portfolio structure has room for improvement.";
    }

    if(market){

        insight+=
            " Estimated 24h impact: "+
            (market.weightedChange>=0?"+":"")+
            market.weightedChange.toFixed(2)+
            "% ("+
            (market.estimatedPnL>=0?"+":"")+
            formatMoney(market.estimatedPnL)+").";

        insight+=
            " Best performer: "+
            market.top.name+" "+
            (market.top.change>=0?"+":"")+
            market.top.change.toFixed(2)+"%.";

        insight+=
            " Weakest: "+
            market.worst.name+" "+
            (market.worst.change>=0?"+":"")+
            market.worst.change.toFixed(2)+"%.";

        const bestContribution=
            [...market.available]
            .sort((a,b)=>b.contribution-a.contribution)[0];

        const worstContribution=
            [...market.available]
            .sort((a,b)=>a.contribution-b.contribution)[0];

        insight+=
            " Largest positive portfolio contribution: "+
            bestContribution.name+".";


        if(worstContribution.contribution<0){

            insight+=
                " Largest negative contribution: "+
                worstContribution.name+".";
        }

        if(market.marketSignal==="High Volatility"){

            insight+=
                " Short-term volatility is high.";

        }else if(market.marketSignal==="Elevated"){

            insight+=
                " Short-term volatility is elevated.";

        }else{

            insight+=
                " Short-term volatility is relatively moderate.";
        }

    }else{

        insight+=
            " Live market data is currently unavailable.";
    }

    document.getElementById("insightText").innerText=insight;
}

function updateAllocationChart(assets){

    const chart=document.getElementById("allocationChart");
    const legend=document.getElementById("allocationLegend");

    chart.innerHTML="";
    legend.innerHTML="";

    const colors=[
        "#f7931a",
        "#627eea",
        "#14f195",
        "#c2a633",
        "#a855f7",
        "#06b6d4",
        "#ef4444",
        "#22c55e",
        "#eab308",
        "#ec4899"
    ];

    assets.forEach((asset,index)=>{

        const color=colors[index%colors.length];

        const segment=document.createElement("div");
        segment.className="allocation";
        segment.style.width=asset.value+"%";
        segment.style.background=color;
        segment.title=asset.name+" "+asset.value+"%";

        chart.appendChild(segment);

        const legendItem=document.createElement("div");
        legendItem.className="legend-item";

        const dot=document.createElement("span");
        dot.className="dot";
        dot.style.background=color;

        const text=document.createElement("span");
        text.innerText=asset.name+" "+asset.value+"%";

        legendItem.appendChild(dot);
        legendItem.appendChild(text);

        legend.appendChild(legendItem);
    });
}

function formatPrice(price){

    if(price>=1000){
        return price.toLocaleString(undefined,{
            minimumFractionDigits:2,
            maximumFractionDigits:2
        });
    }

    if(price>=1){
        return price.toLocaleString(undefined,{
            minimumFractionDigits:2,
            maximumFractionDigits:4
        });
    }

    return price.toLocaleString(undefined,{
        minimumFractionDigits:4,
        maximumFractionDigits:8
    });
}

function formatMoney(value){

    return Number(value).toLocaleString(undefined,{
        minimumFractionDigits:2,
        maximumFractionDigits:2
    })+" USDT";
}

function escapeHtml(value){

    return String(value)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}