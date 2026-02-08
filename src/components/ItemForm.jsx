import { useState, useEffect } from 'react'
import { FaPlusCircle, FaSearch, FaFolder, FaBookmark, FaCube, FaAlignLeft, FaRuler, FaHashtag, FaTag, FaStickyNote } from 'react-icons/fa'
import { presets, defaultDescription } from '../data/presets'

function ItemForm({ addItem, staffMode }) {
  const [section, setSection] = useState('LIVING AREA')
  const [preset, setPreset] = useState('')
  const [presetSearch, setPresetSearch] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [unit, setUnit] = useState('SQFT')
  const [qty, setQty] = useState('')
  const [rateClient, setRateClient] = useState('')
  const [rateActual, setRateActual] = useState('')
  const [remark, setRemark] = useState('')

  const sections = [
    'LIVING AREA',
    'DINING AREA',
    'Master Bedroom',
    'BED ROOM 1',
    'BED ROOM 2',
    'BED ROOM 3',
    'BED ROOM 4',
    'KITCHEN',
    'UTILITY AREA',
    'WASHROOM',
    'TEMPLE AREA',
    'Wall Beautification',
    'TV & Storage Units',
    'Designer Partitions',
    'Plumbing Work',
    'Stone Installation',
    'Vanity',
    'POP Work / False Ceiling',
    'Electrical Work',
    'Civil & Flooring',
    'Painting',
    'Doors & Windows',
    'Furniture',
    'OTHER'
  ]

  useEffect(() => {
    setPreset('')
    setPresetSearch('')
  }, [section])

  // Get presets for the selected section
  const sectionPresets = presets[section] || []
  
  const filteredPresets = sectionPresets.filter(p => 
    p.name.toLowerCase().includes(presetSearch.toLowerCase())
  )

  const handlePresetChange = (e) => {
    const presetName = e.target.value
    setPreset(presetName)
    if (!presetName) return
    
    const p = sectionPresets.find(x => x.name === presetName)
    if (p) {
      setName(p.name)
      setUnit(p.unit)
      setRateClient(p.rate)
      setRateActual(Math.round(p.rate * 0.75))
      setRemark(p.remark)
      setDescription(p.desc || defaultDescription)
    }
  }

  const handleAddItem = () => {
    if (!name || !qty || qty <= 0) {
      alert('Enter valid item details')
      return
    }

    addItem({
      section,
      name,
      description: description || defaultDescription,
      unit,
      qty: parseFloat(qty),
      rateClient: parseFloat(rateClient) || 0,
      rateActual: parseFloat(rateActual) || 0,
      remark
    })

    // Clear form
    setName('')
    setDescription('')
    setQty('')
    setRateClient('')
    setRateActual('')
    setRemark('')
    setPreset('')
  }

  return (
    <div>
      <div className="controls-header">
        <h3><FaPlusCircle /> Add Item</h3>
        <div className="search-box" style={{ position: 'relative' }}>
          <FaSearch />
          <input 
            type="text" 
            placeholder="Search presets..."
            value={presetSearch}
            onChange={(e) => setPresetSearch(e.target.value)}
            style={{ paddingRight: presetSearch ? '30px' : '12px' }}
          />
          {presetSearch && (
            <button 
              onClick={() => setPresetSearch('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--blue)',
                fontSize: '16px',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="form-group">
        <label>
          <span className="label-text"><FaFolder /> Section</span>
          <select className="modern-select" value={section} onChange={(e) => setSection(e.target.value)}>
            {sections.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>

        <label>
          <span className="label-text"><FaBookmark /> Preset {presetSearch && `(${filteredPresets.length} found)`}</span>
          <select 
            className="modern-select preset-dropdown-scrollable" 
            value={preset} 
            onChange={handlePresetChange}
            size="8"
          >
            <option value="">-- Select preset --</option>
            {filteredPresets.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
        </label>

        <label>
          <span className="label-text"><FaCube /> Component Name</span>
          <input className="modern-input" placeholder="e.g., Wardrobe" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label>
          <span className="label-text"><FaAlignLeft /> Description</span>
          <input className="modern-input" placeholder="Short description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <div className="row">
          <label>
            <span className="label-text"><FaRuler /> Unit</span>
            <select className="modern-select" value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="SQFT">SQFT</option>
              <option value="RFT">RFT</option>
              <option value="PCS">PCS</option>
              <option value="LUMP">LUMP</option>
            </select>
          </label>
          <label>
            <span className="label-text"><FaHashtag /> Qty</span>
            <input className="modern-input" type="number" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} />
          </label>
        </div>

        <label>
          <span className="label-text"><FaTag /> Price</span>
          <input className="modern-input" type="number" step="0.01" value={rateClient} onChange={(e) => setRateClient(e.target.value)} />
        </label>

        {staffMode && (
          <label className="actual-col">
            <span className="label-text"><FaTag /> Actual Price</span>
            <input className="modern-input" type="number" step="0.01" value={rateActual} onChange={(e) => setRateActual(e.target.value)} />
          </label>
        )}

        <label>
          <span className="label-text"><FaStickyNote /> Remark</span>
          <input className="modern-input" placeholder="Remark / Notes" value={remark} onChange={(e) => setRemark(e.target.value)} />
        </label>

        <button className="btn-primary" onClick={handleAddItem}>
          <FaPlusCircle /> Add Item
        </button>
      </div>
    </div>
  )
}

export default ItemForm
