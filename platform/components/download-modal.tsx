import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Download } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useState } from "react"

interface DownloadModalProps {
  sensorData: any
  megData: number[][]
}

export function DownloadModal({ sensorData, megData }: DownloadModalProps) {
  const [format, setFormat] = useState('csv')
  const [signalType, setSignalType] = useState<'eeg' | 'meg'>('eeg')

  const handleDownload = () => {
    const data = signalType === 'eeg' ? sensorData?.eeg?.data : megData
    if (!data) return

    let content = ''
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    let filename = `brain-signals-${signalType}-${timestamp}.${format}`

    if (format === 'csv') {
      content = data.map(d => d.value).join(',')
    } else if (format === 'json') {
      content = JSON.stringify(data, null, 2)
    }

    const blob = new Blob([content], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="w-10 h-10">
          <Download className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Download Brain Signals</DialogTitle>
          <DialogDescription>
            Choose signal type and format for download.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="eeg" onValueChange={(value) => setSignalType(value as 'eeg' | 'meg')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="eeg">Raw EEG</TabsTrigger>
            <TabsTrigger value="meg">AI-Derived MEG</TabsTrigger>
          </TabsList>
          <TabsContent value="eeg">
            <div className="grid gap-4 py-4">
              <RadioGroup defaultValue="csv" onValueChange={setFormat}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="eeg-csv" />
                  <Label htmlFor="eeg-csv">CSV Format</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="json" id="eeg-json" />
                  <Label htmlFor="eeg-json">JSON Format</Label>
                </div>
              </RadioGroup>
            </div>
          </TabsContent>
          <TabsContent value="meg">
            <div className="grid gap-4 py-4">
              <RadioGroup defaultValue="csv" onValueChange={setFormat}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="meg-csv" />
                  <Label htmlFor="meg-csv">CSV Format</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="json" id="meg-json" />
                  <Label htmlFor="meg-json">JSON Format</Label>
                </div>
              </RadioGroup>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={handleDownload}>Download</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
