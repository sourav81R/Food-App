import React from 'react'
import { LayersControl, ScaleControl, TileLayer } from 'react-leaflet'

const { BaseLayer, Overlay } = LayersControl

function EnhancedMapLayers() {
    return (
        <>
            <ScaleControl position="bottomleft" imperial={false} />
            <LayersControl position="topright">
                <BaseLayer checked name="Detailed Streets">
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                        subdomains={['a', 'b', 'c', 'd']}
                        maxZoom={20}
                    />
                </BaseLayer>
                <BaseLayer name="Locality Map">
                    <TileLayer
                        attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
                        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                        maxZoom={17}
                    />
                </BaseLayer>
                <BaseLayer name="Classic OSM">
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        maxZoom={19}
                    />
                </BaseLayer>
                <Overlay checked name="Place Labels">
                    <TileLayer
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
                        subdomains={['a', 'b', 'c', 'd']}
                        pane="overlayPane"
                    />
                </Overlay>
            </LayersControl>
        </>
    )
}

export default EnhancedMapLayers
