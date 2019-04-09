import React from 'react';
import PropTypes from 'prop-types';
import MaterialReactSelect from "../../common/MaterialReactSelect";
import {getLabel} from "../../../utils/metadataUtils";
import {compareBy} from "../../../utils/comparisionUtils";

function Dropdown({entities, property, onSave, onChange, ...otherProps}) {
    // Transform the entities to ensure a label is present
    const options = entities.map((entity) => {
        const id = entity['@id'];
        const value = entity['@value'];
        const label = getLabel(entity) || value;
        const disabled = property.values.some(v => (v.id && v.id === id) || (v.value && v.value === value));

        return {
            disabled,
            label,
            id,
            value
        };
    }).sort(compareBy('disabled'));

    // Prevent saving any labels used for UI
    const handleSave = (selected) => {
        onChange({id: selected.id, label: selected.label, value: selected.value});
    };

    return (
        <MaterialReactSelect
            style={{width: '100%'}}
            {...otherProps}
            options={options}
            onChange={handleSave}
        />
    );
}

Dropdown.propTypes = {
    property: PropTypes.object.isRequired,
    entry: PropTypes.object,
    onSave: PropTypes.func,
    entities: PropTypes.array
};

export default (Dropdown);
