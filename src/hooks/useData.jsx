import { useState, useEffect, useCallback } from 'react'
import {
  fetchTrades, fetchAccounts, fetchWithdrawals, fetchRules, fetchProfile,
  saveTrade, saveAccount, deleteAccount, updateAccountStatus,
  saveWithdrawal, deleteWithdrawal, saveRule, deleteRule, saveProfile,
  bulkMigrate, bulkImportCSV, updateTrade, deleteTrade, exportToCSV
} from '../lib/sync'

export default function useData(userId) {
  const [trades, setTrades] = useState([])
  const [accounts, setAccounts] = useState([])
  const [withdrawals, setWithdrawals] = useState({})
  const [rules, setRules] = useState([])
  const [profile, setProfile] = useState({})
  const [loading, setLoading] = useState(true)
  const [dataExists, setDataExists] = useState(false)

  const reload = useCallback(async () => {
    try {
      const [T, A, W, R, P] = await Promise.all([
        fetchTrades(userId), fetchAccounts(userId),
        fetchWithdrawals(userId), fetchRules(userId), fetchProfile(userId)
      ])
      setTrades(T); setAccounts(A); setWithdrawals(W)
      setRules(R); setProfile(P || {})
      setDataExists(T.length > 0 || A.length > 0)
    } catch (e) { console.error('reload error:', e) }
    setLoading(false)
  }, [userId])

  useEffect(() => { reload() }, [reload])

  const addTrade = async (trade) => { await saveTrade(userId, trade); await reload() }
  const removeTrade = async (id) => { await deleteTrade(id); await reload() }
  const editTrade = async (id, updates) => { await updateTrade(id, updates); await reload() }
  const addAccount = async (acc) => { await saveAccount(userId, acc); await reload() }
  const removeAccount = async (id) => { await deleteAccount(id); await reload() }
  const setAccStatus = async (id, status) => { await updateAccountStatus(id, status); await reload() }
  const addWithdrawal = async (accId, wd) => { await saveWithdrawal(userId, accId, wd); await reload() }
  const removeWithdrawal = async (id) => { await deleteWithdrawal(id); await reload() }
  const addRule = async (rule) => { await saveRule(userId, rule); await reload() }
  const removeRule = async (id) => { await deleteRule(id); await reload() }
  const updateProfile = async (p) => { await saveProfile(userId, p); await reload() }

  const migrateFromPreload = async () => {
    const res = await fetch('/edgelog/preload.json')
    const data = await res.json()
    await bulkMigrate(userId, data)
    await reload()
  }

  const importCSV = async (csvText) => {
    const result = await bulkImportCSV(userId, csvText, accounts)
    await reload()
    return result
  }

  const exportCSV = () => exportToCSV(trades)

  return {
    trades, accounts, withdrawals, rules, profile,
    loading, dataExists, reload,
    addTrade, removeTrade, editTrade,
    addAccount, removeAccount, setAccStatus,
    addWithdrawal, removeWithdrawal,
    addRule, removeRule,
    updateProfile, migrateFromPreload, importCSV, exportCSV
  }
}
