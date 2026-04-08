import React from 'react';
import { Radio } from 'antd';

type BodyType = 'none' | 'form-data' | 'x-www-form-urlencoded' | 'json' | 'xml' | 'raw' | 'binary';

interface BodyTypeSelectorProps {
    value: BodyType;
    onChange: (type: BodyType) => void;
}

export const BodyTypeSelector: React.FC<BodyTypeSelectorProps> = ({ value, onChange }) => {
    return (
        <Radio.Group
            value={value || 'none'}
            onChange={(e) => onChange(e.target.value)}
            optionType="button"
            buttonStyle="solid"
        >
            <Radio.Button value="none">none</Radio.Button>
            <Radio.Button value="form-data">form-data</Radio.Button>
            <Radio.Button value="x-www-form-urlencoded">x-www-form-urlencoded</Radio.Button>
            <Radio.Button value="json">JSON</Radio.Button>
            <Radio.Button value="xml">XML</Radio.Button>
            <Radio.Button value="raw">Raw</Radio.Button>
            <Radio.Button value="binary">Binary</Radio.Button>
        </Radio.Group>
    );
};