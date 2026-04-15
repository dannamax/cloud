import express from 'express';
import { getDatabase } from '../database.js';

const router = express.Router();

// 机柜年租金常量
const CABINET_ANNUAL_FEE = 4000;

// 设备折旧年限
const DEPRECIATION_YEARS = 4;

/**
 * 计算设备残值
 * 折旧方式：采购价按4年平均折旧，4年后残值为0
 */
function calculateResidualValue(purchasePrice: number, purchaseDate: string): number {
  if (!purchasePrice || purchasePrice <= 0) {
    return 0;
  }
  
  const now = new Date();
  const purchaseTime = new Date(purchaseDate);
  
  // 如果采购日期无效或在未来，返回采购价
  if (isNaN(purchaseTime.getTime()) || purchaseTime > now) {
    return purchasePrice;
  }
  
  // 计算已使用年限（按月计算，然后转成年）
  const monthsDiff = (now.getFullYear() - purchaseTime.getFullYear()) * 12 + (now.getMonth() - purchaseTime.getMonth());
  const yearsUsed = monthsDiff / 12;
  
  // 如果已使用超过4年，残值为0
  if (yearsUsed >= DEPRECIATION_YEARS) {
    return 0;
  }
  
  // 按月线性折旧
  const monthlyDepreciation = purchasePrice / (DEPRECIATION_YEARS * 12);
  const residualValue = purchasePrice - (monthlyDepreciation * monthsDiff);
  
  // 确保残值不为负数
  return Math.max(0, Math.round(residualValue * 100) / 100);
}

/**
 * 计算已折旧金额
 */
function calculateDepreciatedAmount(purchasePrice: number, purchaseDate: string): number {
  if (!purchasePrice || purchasePrice <= 0) {
    return 0;
  }
  
  return purchasePrice - calculateResidualValue(purchasePrice, purchaseDate);
}

// 获取成本统计总览
router.get('/overview', (req, res) => {
  const db = getDatabase();
  
  try {
    // 获取所有服务器的采购信息（包含所有状态）
    const servers = db.prepare(`
      SELECT id, name, purchase_price, purchase_date, cabinet, environment, status
      FROM servers 
      WHERE purchase_price > 0 OR purchase_date IS NOT NULL
    `).all() as any[];
    
    // 计算设备成本统计
    let totalPurchasePrice = 0;
    let totalResidualValue = 0;
    let totalDepreciatedValue = 0;
    let serverCountWithPrice = 0;
    
    const serverCostDetails: any[] = [];
    
    servers.forEach((server: any) => {
      const price = server.purchase_price || 0;
      const date = server.purchase_date || server.created_at;
      
      if (price > 0) {
        serverCountWithPrice++;
        totalPurchasePrice += price;
        
        const residual = calculateResidualValue(price, date);
        const depreciated = calculateDepreciatedAmount(price, date);
        
        totalResidualValue += residual;
        totalDepreciatedValue += depreciated;
        
        serverCostDetails.push({
          id: server.id,
          name: server.name || `Server-${server.id}`,
          purchasePrice: price,
          purchaseDate: date,
          residualValue: residual,
          depreciatedValue: depreciated,
          cabinet: server.cabinet,
          environment: server.environment,
        });
      }
    });
    
    // 获取机柜统计（包含所有状态）
    const cabinetStats = db.prepare(`
      SELECT cabinet, environment, COUNT(*) as server_count
      FROM servers
      WHERE cabinet IS NOT NULL AND cabinet != ''
      GROUP BY cabinet, environment
      ORDER BY cabinet
    `).all() as any[];
    
    // 计算机柜占用费用（每个机柜固定4000元/年）
    const cabinetCosts = cabinetStats.map((cabinet: any) => ({
      cabinet: cabinet.cabinet,
      environment: cabinet.environment,
      serverCount: cabinet.server_count,
      annualFee: CABINET_ANNUAL_FEE,
    }));
    
    const totalCabinetCost = cabinetCosts.reduce((sum: number, c: any) => sum + c.annualFee, 0);
    
    // 按环境统计机柜成本
    const cabinetByEnv = cabinetStats.reduce((acc: any, cabinet: any) => {
      const env = cabinet.environment || '未分类';
      if (!acc[env]) {
        acc[env] = { environment: env, cabinetCount: 0, serverCount: 0, annualFee: 0 };
      }
      acc[env].cabinetCount++;
      acc[env].serverCount += cabinet.server_count;
      acc[env].annualFee += CABINET_ANNUAL_FEE;
      return acc;
    }, {});
    
    // 成本汇总
    const summary = {
      // 设备成本
      deviceCost: {
        totalServers: servers.length,
        serversWithPrice: serverCountWithPrice,
        totalPurchasePrice: Math.round(totalPurchasePrice * 100) / 100,
        totalResidualValue: Math.round(totalResidualValue * 100) / 100,
        totalDepreciatedValue: Math.round(totalDepreciatedValue * 100) / 100,
        depreciationProgress: totalPurchasePrice > 0 
          ? Math.round((totalDepreciatedValue / totalPurchasePrice) * 10000) / 100 
          : 0,
      },
      // 机柜成本
      cabinetCost: {
        totalCabinets: cabinetStats.length,
        totalServers: cabinetStats.reduce((sum: number, c: any) => sum + c.server_count, 0),
        annualFeePerCabinet: CABINET_ANNUAL_FEE,
        totalAnnualFee: totalCabinetCost,
      },
      // 总成本
      totalCost: {
        currentValue: Math.round((totalResidualValue + totalCabinetCost) * 100) / 100,
        totalInvested: Math.round((totalPurchasePrice + totalCabinetCost) * 100) / 100,
      },
    };
    
    res.json({
      summary,
      serverCostDetails,
      cabinetCosts,
      cabinetByEnv: Object.values(cabinetByEnv),
    });
  } catch (error) {
    console.error('[成本统计] 获取失败:', error);
    res.status(500).json({ error: '获取成本统计失败' });
  }
});

// 获取单台设备的成本详情
router.get('/server/:id', (req, res) => {
  const db = getDatabase();
  
  try {
    const server = db.prepare(`
      SELECT id, name, purchase_price, purchase_date, cabinet, environment, brand, model
      FROM servers WHERE id = ?
    `).get(req.params.id) as any;
    
    if (!server) {
      return res.status(404).json({ error: '服务器不存在' });
    }
    
    const price = server.purchase_price || 0;
    const date = server.purchase_date || server.created_at;
    
    const now = new Date();
    const purchaseTime = new Date(date);
    const monthsDiff = (now.getFullYear() - purchaseTime.getFullYear()) * 12 + (now.getMonth() - purchaseTime.getMonth());
    const yearsUsed = monthsDiff / 12;
    
    const residualValue = calculateResidualValue(price, date);
    const depreciatedValue = calculateDepreciatedAmount(price, date);
    
    // 计算每月折旧额
    const monthlyDepreciation = price / (DEPRECIATION_YEARS * 12);
    
    // 预计剩余折旧时间
    const remainingMonths = Math.max(0, DEPRECIATION_YEARS * 12 - monthsDiff);
    
    res.json({
      id: server.id,
      name: server.name || `Server-${server.id}`,
      brand: server.brand,
      model: server.model,
      purchasePrice: price,
      purchaseDate: date,
      residualValue,
      depreciatedValue,
      depreciationProgress: price > 0 ? Math.round((depreciatedValue / price) * 10000) / 100 : 0,
      yearsUsed: Math.round(yearsUsed * 100) / 100,
      monthsUsed: monthsDiff,
      monthlyDepreciation: Math.round(monthlyDepreciation * 100) / 100,
      remainingMonths,
      fullyDepreciated: yearsUsed >= DEPRECIATION_YEARS,
      cabinet: server.cabinet,
      environment: server.environment,
      cabinetAnnualFee: CABINET_ANNUAL_FEE,
    });
  } catch (error) {
    console.error('[成本统计] 获取设备成本详情失败:', error);
    res.status(500).json({ error: '获取设备成本详情失败' });
  }
});

// 获取机柜成本明细
router.get('/cabinets', (req, res) => {
  const db = getDatabase();
  const { environment } = req.query;
  
  try {
    let query = `
      SELECT 
        cabinet,
        environment,
        COUNT(*) as server_count,
        SUM(COALESCE(purchase_price, 0)) as total_purchase_price,
        SUM(COALESCE(purchase_price, 0)) / COUNT(*) as avg_purchase_price
      FROM servers
      WHERE cabinet IS NOT NULL AND cabinet != ''
    `;
    
    const params: any[] = [];
    
    if (environment) {
      query += ' AND environment = ?';
      params.push(environment);
    }
    
    query += ' GROUP BY cabinet, environment ORDER BY cabinet';
    
    const cabinets = db.prepare(query).all(...params) as any[];
    
    // 计算每台设备的残值
    const result = cabinets.map((cabinet: any) => {
      // 获取该机柜的所有服务器
      const servers = db.prepare(`
        SELECT id, name, purchase_price, purchase_date
        FROM servers
        WHERE cabinet = ? AND environment = ?
      `).all(cabinet.cabinet, cabinet.environment) as any[];
      
      let totalResidualValue = 0;
      let totalDepreciatedValue = 0;
      
      servers.forEach((server: any) => {
        const residual = calculateResidualValue(server.purchase_price || 0, server.purchase_date || server.created_at);
        const depreciated = calculateDepreciatedAmount(server.purchase_price || 0, server.purchase_date || server.created_at);
        totalResidualValue += residual;
        totalDepreciatedValue += depreciated;
      });
      
      return {
        cabinet: cabinet.cabinet,
        environment: cabinet.environment,
        serverCount: cabinet.server_count,
        totalPurchasePrice: cabinet.total_purchase_price || 0,
        avgPurchasePrice: Math.round((cabinet.avg_purchase_price || 0) * 100) / 100,
        totalResidualValue: Math.round(totalResidualValue * 100) / 100,
        totalDepreciatedValue: Math.round(totalDepreciatedValue * 100) / 100,
        cabinetAnnualFee: CABINET_ANNUAL_FEE,
        totalAnnualCost: CABINET_ANNUAL_FEE + totalResidualValue,
      };
    });
    
    res.json(result);
  } catch (error) {
    console.error('[成本统计] 获取机柜成本明细失败:', error);
    res.status(500).json({ error: '获取机柜成本明细失败' });
  }
});

// 按环境统计成本
router.get('/by-environment', (req, res) => {
  const db = getDatabase();
  
  try {
    const stats = db.prepare(`
      SELECT 
        COALESCE(environment, '未分类') as environment,
        COUNT(*) as server_count,
        SUM(COALESCE(purchase_price, 0)) as total_purchase_price
      FROM servers
      GROUP BY environment
      ORDER BY environment
    `).all() as any[];
    
    const result = stats.map((stat: any) => {
      // 获取该环境所有服务器
      const servers = db.prepare(`
        SELECT id, purchase_price, purchase_date, cabinet
        FROM servers
        WHERE COALESCE(environment, '') = ?
      `).all(stat.environment || '') as any[];
      
      let totalResidualValue = 0;
      let totalDepreciatedValue = 0;
      let cabinetCount = 0;
      
      servers.forEach((server: any) => {
        const residual = calculateResidualValue(server.purchase_price || 0, server.purchase_date || server.created_at);
        const depreciated = calculateDepreciatedAmount(server.purchase_price || 0, server.purchase_date || server.created_at);
        totalResidualValue += residual;
        totalDepreciatedValue += depreciated;
      });
      
      // 统计机柜数量
      const cabinets = db.prepare(`
        SELECT COUNT(DISTINCT cabinet) as count
        FROM servers
        WHERE COALESCE(environment, '') = ? AND cabinet IS NOT NULL AND cabinet != ''
      `).get(stat.environment || '') as any;
      
      const serverCount = servers.length;
      
      return {
        environment: stat.environment,
        serverCount,
        cabinetCount: cabinets?.count || 0,
        totalPurchasePrice: stat.total_purchase_price || 0,
        totalResidualValue: Math.round(totalResidualValue * 100) / 100,
        totalDepreciatedValue: Math.round(totalDepreciatedValue * 100) / 100,
        cabinetAnnualFee: (cabinets?.count || 0) * CABINET_ANNUAL_FEE,
        totalAnnualCost: ((cabinets?.count || 0) * CABINET_ANNUAL_FEE) + totalResidualValue,
      };
    });
    
    res.json(result);
  } catch (error) {
    console.error('[成本统计] 按环境统计失败:', error);
    res.status(500).json({ error: '按环境统计成本失败' });
  }
});

export default router;
