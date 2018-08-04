package server

import (
	"github.com/cptcretin/forge/app"
)

func Start() {
	s := CreateServer()

	s.POST("/auth", NewEchoContext(Auth, "Authenticate User"))
	s.POST("/signup", NewEchoContext(CreateAccount, "Create User"))

	s.Static("/", "server/www")

	pr := s.Group("/project")
	pr.GET("/", NewEchoContext(GetProjects, "Retrieve Projects"))
	pr.POST("/", NewEchoContext(CreateProject, "Create Project"))
	pr.PUT("/:handle", NewEchoContext(UpdateProject, "Update Project"))
	pr.Use(NewMiddlewareContext(AuthorizeClient, "Authorize Client"))

	admin := s.Group("/admin")
	admin.GET("/all-accounts", NewEchoContext(GetAllAccounts, "Admin - Get All Accounts"))
	admin.PUT("/approve/:handle", NewEchoContext(ApproveAccount, "Admin - Approve Account"))
	admin.PUT("/suspend/:handle", NewEchoContext(SuspendAccount, "Admin - Suspend Account"))
	admin.PUT("/deny/:handle", NewEchoContext(DenyAccount, "Admin - Deny Account"))
	s.Logger.Fatal(s.Start(":" + app.Environment("PORT")))
}
