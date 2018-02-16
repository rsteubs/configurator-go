package app

import (
    "reflect"
)

type Custom func(string, reflect.Value) reflect.Value

func Translate(s interface {}, d interface {}) {
    dVal := reflect.ValueOf(d).Elem()
    dType := dVal.Type()

    fields := make(map[string]reflect.Value, dVal.NumField())

    for i := 0; i < dVal.NumField(); i++ {
        fields[dType.Field(i).Name] = dVal.Field(i)
    }

    sVal := reflect.ValueOf(s)
    sType := sVal.Type()

    for i := 0; i < sVal.NumField(); i++ {
        if field, exists := fields[sType.Field(i).Name]; exists && field.Kind() == sVal.Field(i).Kind() {
            field.Set(sVal.Field(i))
        }
    }
}

func TranslateCustom(s interface {}, d interface {}, handler Custom)  {
    dVal := reflect.ValueOf(d).Elem()
    dType := dVal.Type()

    fields := make(map[string]reflect.Value, dVal.NumField())

    for i := 0; i < dVal.NumField(); i++ {
        fields[dType.Field(i).Name] = dVal.Field(i)
    }

    sVal := reflect.ValueOf(s)
    sType := sVal.Type()

    for i := 0; i < sVal.NumField(); i++ {
        name := sType.Field(i).Name

        if field, exists := fields[name]; exists {
            field.Set(handler(name, sVal.Field(i)))
        }
    }
}