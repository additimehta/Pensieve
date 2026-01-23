import React, { useEffect, useRef, useState } from 'react';
import "./pensieve.css";

export default function PensieveBackground({ children, isDiving }) {
    return (
        <div className={`pensieve-root ${isDiving ? 'diving' : 'ambient'}`}>
            <div className="gradient-layer" />

            <div className="pensieve-content">
                {children}
            </div>
        </div>
    );
}
