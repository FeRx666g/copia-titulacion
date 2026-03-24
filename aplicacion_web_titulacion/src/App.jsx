//App.jsx
import './index.css'
import { UserProvider } from './providers/UserProvider'
import { RouterPrincipal } from './routers/RouterPrincipal'

function App() {
  return (
    <UserProvider>
      <RouterPrincipal />
    </UserProvider>
  )
}

export default App