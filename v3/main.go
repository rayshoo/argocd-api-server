package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/rayshoo/argocd-api-server.v3/routes"

	"github.com/gorilla/mux"
	"github.com/unrolled/render"
	"github.com/urfave/negroni"
)

var rd *render.Render

func MakeWebHandler() http.Handler {
	router := mux.NewRouter()
	router.Handle("/", http.FileServer(http.Dir("public")))
	router.HandleFunc("/login", func(_ http.ResponseWriter, _ *http.Request) { getToken() })
	router.Methods("GET").Path("/app").HandlerFunc(routes.GetApp)
	router.Methods("GET").Path("/app/{name}").HandlerFunc(routes.GetApp)
	router.Methods("POST").Path("/app/{name}/sync").HandlerFunc(routes.SyncApp)
	return router
}

func getToken() {
	apiSpec := routes.ApiSpec{
		Method: "POST",
		Path:   "http://localhost:8080/api/v1/session",
	}
	data, _, err := apiSpec.SendRequest()
	if err != nil {
		fmt.Println("qwfp")
		panic(err)
	}
	var body routes.Body
	err = json.Unmarshal(*data, &body)
	if err != nil {
		panic(err)
	}
	fmt.Println(body)
}

func main() {
	rd = render.New()
	m := MakeWebHandler()
	n := negroni.Classic()
	n.UseHandler(m)

	port := os.Getenv("PORT")
	port = "3000"
	err := http.ListenAndServe(":"+port, n)
	if err != nil {
		panic(err)
	}
}
