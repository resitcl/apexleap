const GESTDOC_BASE_URL = 'https://flow.gestdoc.cl/api/external'

interface GestdocSigner {
  email: string
  name: string
  rut?: string
}

interface CreateAndSignRequest {
  bpmn_id: string
  form_data: Record<string, string>
  signers: GestdocSigner[]
}

interface GestdocProcess {
  id: string
  status: string
  signing_url?: string
  signed_document_url?: string
  created_at?: string
  updated_at?: string
}

interface BpmnProcess {
  id: string
  name: string
  description?: string
}

export class GestdocClient {
  private apiKey: string

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('GESTDOC API key is required')
    }
    this.apiKey = apiKey
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${GESTDOC_BASE_URL}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GESTDOC API error:', response.status, errorText)
      throw new Error(`GESTDOC API error: ${response.status} - ${errorText}`)
    }

    return response.json()
  }

  /**
   * Lista los procesos BPMN disponibles
   */
  async listBpmnProcesses(): Promise<BpmnProcess[]> {
    return this.request<BpmnProcess[]>('/bpmn')
  }

  /**
   * Crea un nuevo proceso con datos pre-llenados
   */
  async createProcess(params: {
    bpmn_id: string
    form_data: Record<string, string>
  }): Promise<GestdocProcess> {
    return this.request<GestdocProcess>('/process', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }

  /**
   * Crea proceso, completa formulario y solicita firmas en un paso
   */
  async createAndSign(params: CreateAndSignRequest): Promise<GestdocProcess> {
    return this.request<GestdocProcess>('/create-and-sign', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }

  /**
   * Consulta el estado de un proceso
   */
  async getProcessStatus(processId: string): Promise<GestdocProcess> {
    return this.request<GestdocProcess>(`/process/${processId}`)
  }
}

// Singleton instance using environment variable
let clientInstance: GestdocClient | null = null

export function getGestdocClient(): GestdocClient {
  if (!clientInstance) {
    const apiKey = process.env.GESTDOC_API_KEY
    if (!apiKey) {
      throw new Error('GESTDOC_API_KEY environment variable is not set')
    }
    clientInstance = new GestdocClient(apiKey)
  }
  return clientInstance
}

// For clubs with their own API key
export function createGestdocClient(apiKey: string): GestdocClient {
  return new GestdocClient(apiKey)
}
