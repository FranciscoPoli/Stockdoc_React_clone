import axios from "axios";
import { StockInfo, FinancialData } from "../types/stock";

const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://stockdoc-react-clone.vercel.app/api'
  : '/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

export async function searchStock(symbol: string): Promise<StockInfo> {
  const response = await axiosInstance.get(`/stock/${symbol}`);
  return response.data;
}

export async function getFinancialData(symbol: string): Promise<FinancialData> {
  const response = await axiosInstance.get(`/financial/${symbol}`);
  return response.data;
}
