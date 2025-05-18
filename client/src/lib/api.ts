import axios from "axios";
import { StockInfo, FinancialData } from "../types/stock";

const API_URL = "/api";

export async function searchStock(symbol: string): Promise<StockInfo> {
  const response = await axios.get(`${API_URL}/stock/${symbol}`);
  return response.data;
}

export async function getFinancialData(symbol: string): Promise<FinancialData> {
  const response = await axios.get(`${API_URL}/financial/${symbol}`);
  return response.data;
}
