package routes

import (
	"io/ioutil"
	"net/http"
)

type Results []interface{}
type Body interface{}
type ApiSpec struct {
	Headers     *map[string]string
	Method      string
	Path        string
	RequestBody map[string]interface{}
}

func (apiSpec *ApiSpec) SendRequest() (*[]byte, int, error) {
	var req *http.Request
	var err error
	if apiSpec.RequestBody != nil {

	} else {
		req, err = http.NewRequest(apiSpec.Method, apiSpec.Path, nil)
	}
	if err != nil {
		return nil, 0, err
	}
	for k, v := range *apiSpec.Headers {
		req.Header.Set(k, v)
	}
	client := &http.Client{}
	res, err := client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()
	data, err := ioutil.ReadAll(res.Body)
	if err != nil {
		return nil, 0, err
	}
	return &data, res.StatusCode, nil
}
