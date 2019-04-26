import React from 'react';
import {shallow} from "enzyme";
import {List, ListItem} from '@material-ui/core';
import ClearIcon from '@material-ui/icons/Clear';

import {STRING_URI} from "../../../constants";
import LinkedDataProperty from "./LinkedDataProperty";
import StringValue from "./values/StringValue";
import ReferringValue from "./values/ReferringValue";
import DateValue from "./values/DateValue";

const defaultProperty = {
    key: 'description',
    datatype: STRING_URI,
    label: 'Description',
    values: [{value: 'More info'}, {value: 'My first collection'}, {value: 'My second collection'}],
    maxValuesCount: 4
};

const mockComponentFactory = {
    addComponent: () => StringValue,
    editComponent: () => DateValue,
    readOnlyComponent: () => ReferringValue
};

describe('LinkedDataProperty elements', () => {
    it('shows all provided values', () => {
        const property = {
            ...defaultProperty,
            maxValuesCount: 1
        };

        const wrapper = shallow(<LinkedDataProperty editable property={property} />, {context: mockComponentFactory});
        const listItems = wrapper.find(List).find(ListItem);

        expect(listItems.length).toEqual(3);
    });

    it('shows an add element if multiple values are allowed, and it is editable', () => {
        const wrapper = shallow(<LinkedDataProperty editable property={defaultProperty} />, {context: mockComponentFactory});

        const listItems = wrapper.find(List).find(ListItem);
        expect(listItems.length).toEqual(4);
        const deletIcons = wrapper.find(List).find(ClearIcon);
        expect(deletIcons.length).toEqual(3);
    });

    it('shows no add element if multiple values are allowed, but it is uneditable', () => {
        const wrapper = shallow(<LinkedDataProperty editable={false} property={defaultProperty} />, {context: mockComponentFactory});

        const listItems = wrapper.find(List).find(ListItem);
        expect(listItems.length).toEqual(3);
        const deletIcons = wrapper.find(List).find(ClearIcon);
        expect(deletIcons.length).toEqual(0);
    });

    it('shows an add element if there is no value yet, and it is editable', () => {
        const property = {
            ...defaultProperty,
            values: []
        };

        const wrapper = shallow(<LinkedDataProperty editable property={property} />, {context: mockComponentFactory});

        const listItems = wrapper.find(List).find(ListItem);
        expect(listItems.length).toEqual(1);

        // Assert contents of the single component
        const ExpectedComponent = mockComponentFactory.addComponent(property);
        const inputComponent = listItems.at(0).dive().find(ExpectedComponent);
        expect(inputComponent.prop('entry')).toEqual({value: ""});
    });

    it('shows no add element if there is no value yet, but it is uneditable', () => {
        const property = {
            ...defaultProperty,
            values: []
        };

        const wrapper = shallow(<LinkedDataProperty editable={false} property={property} />, {context: mockComponentFactory});

        const listItems = wrapper.find(List).find(ListItem);
        expect(listItems.length).toEqual(0);
    });

    it('does not show an add element if one value has been provided already, and it is editable', () => {
        const property = {
            ...defaultProperty,
            values: [{value: 'More info'}],
            maxValuesCount: 1
        };

        const wrapper = shallow(<LinkedDataProperty editable property={property} />, {context: mockComponentFactory});

        const listItems = wrapper.find(List).find(ListItem);
        expect(listItems.length).toEqual(1);

        // Assert contents of the single component
        const ExpectedComponent = mockComponentFactory.editComponent(property);
        const inputComponent = listItems.at(0).dive().find(ExpectedComponent);
        expect(inputComponent.prop('entry').value).toEqual('More info');
    });

    it('does not show an add element if multiples values are provided, but it is not editable', () => {
        const property = {
            ...defaultProperty,
            values: [{value: 'More info'}, {value: 'another info'}],
            maxValuesCount: 2
        };

        const wrapper = shallow(<LinkedDataProperty editable={false} property={property} />, {context: mockComponentFactory});
        const listItems = wrapper.find(List).find(ListItem);
        expect(listItems.length).toEqual(2);
    });
});
