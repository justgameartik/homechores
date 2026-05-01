const BASE = '/api'

function token() {
  return localStorage.getItem('token')
}

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export const api = {
  register: (body) => req('POST', '/auth/register', body),
  join: (body) => req('POST', '/auth/join', body),
  login: (body) => req('POST', '/auth/login', body),
  getFamily: () => req('GET', '/family'),
  getChores: () => req('GET', '/chores'),
  addChore: (body) => req('POST', '/chores', body),
  logChore: (chore_id, target_user_id) => req('POST', '/log', { chore_id, target_user_id }),
  quickLog: (body) => req('POST', '/log/quick', body),
  getHistory: (userID) => req('GET', `/history/${userID}`),
  removeMember: (userID) => req('DELETE', `/members/${userID}`),
  resetFamily: () => req('DELETE', '/family/reset'),
  updateChore: (choreID, body) => req('PUT', `/chores/${choreID}`, body),
  deleteChore: (choreID) => req('DELETE', `/chores/${choreID}`),
  deleteLog: (logID) => req('DELETE', `/log/${logID}`),
  updateUser: (body) => req('PATCH', '/user', body),
  changePassword: (body) => req('PATCH', '/user/password', body),
}