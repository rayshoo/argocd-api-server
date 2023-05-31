package routes

import (
	"fmt"
	"github.com/gorilla/mux"
	"net/http"
)

func GetApp(res http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	fmt.Println(vars["name"])
	return
}

func SyncApp(res http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	fmt.Println(vars["name"])
	fmt.Println("sync")
	return
}
