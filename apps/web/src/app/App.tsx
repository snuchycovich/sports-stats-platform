import { mockGame, mockSituation, mockSyncState } from '../features/live-capture/live-capture.mock'
import { LiveCaptureScreen } from '../features/live-capture/LiveCaptureScreen'

function App() {
  return(
    <LiveCaptureScreen 
      game={mockGame} 
      situation={mockSituation} 
      syncState={mockSyncState} 
    />
  )
}

export default App
