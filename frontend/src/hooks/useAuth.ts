import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import {
  type Body_login_login_access_token as AccessToken,
  LoginService,
  type UserPublic,
  type UserRegister,
  UsersService,
} from "@/client"
import { handleError } from "@/utils"
import useCustomToast from "./useCustomToast"

const isLoggedIn = () => {
  return (
    sessionStorage.getItem("access_token") !== null ||
    localStorage.getItem("access_token") !== null
  )
}

const isDemoSession = () => {
  return sessionStorage.getItem("is_demo") === "true"
}

const useAuth = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useCustomToast()

  const { data: user } = useQuery<UserPublic | null, Error>({
    queryKey: ["currentUser"],
    queryFn: UsersService.readUserMe,
    enabled: isLoggedIn(),
  })

  const signUpMutation = useMutation({
    mutationFn: (data: UserRegister) =>
      UsersService.registerUser({ requestBody: data }),
    onSuccess: () => {
      navigate({ to: "/login" })
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const login = async (data: AccessToken) => {
    const response = await LoginService.loginAccessToken({
      formData: data,
    })
    sessionStorage.removeItem("access_token")
    sessionStorage.removeItem("is_demo")
    localStorage.setItem("access_token", response.access_token)
  }

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      navigate({ to: "/" })
    },
    onError: handleError.bind(showErrorToast),
  })

  const startDemo = async () => {
    const response = await LoginService.startDemoSession()
    sessionStorage.setItem("access_token", response.access_token)
    sessionStorage.setItem("is_demo", "true")
    localStorage.removeItem("access_token")
    return response
  }

  const demoMutation = useMutation({
    mutationFn: startDemo,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      queryClient.invalidateQueries({ queryKey: ["lists"] })
      navigate({
        to: "/lists/$listId",
        params: { listId: data.list_id },
      })
    },
    onError: handleError.bind(showErrorToast),
  })

  const resetDemo = async () => {
    const response = await LoginService.resetDemoSession()
    sessionStorage.setItem("access_token", response.access_token)
    queryClient.invalidateQueries({ queryKey: ["lists"] })
    queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    return response
  }

  const resetDemoMutation = useMutation({
    mutationFn: resetDemo,
    onSuccess: (data) => {
      showSuccessToast("Demo outline reset to default state")
      navigate({
        to: "/lists/$listId",
        params: { listId: data.list_id },
      })
    },
    onError: handleError.bind(showErrorToast),
  })

  const exitDemo = async () => {
    try {
      await LoginService.cleanupDemoSession()
    } catch {
      // ignore
    } finally {
      sessionStorage.removeItem("access_token")
      sessionStorage.removeItem("is_demo")
      queryClient.clear()
      navigate({ to: "/login" })
    }
  }

  const exitDemoMutation = useMutation({
    mutationFn: exitDemo,
  })

  const logout = () => {
    if (sessionStorage.getItem("is_demo") === "true") {
      try {
        LoginService.cleanupDemoSession().catch(() => {})
      } catch {
        // ignore
      }
    }
    localStorage.removeItem("access_token")
    sessionStorage.removeItem("access_token")
    sessionStorage.removeItem("is_demo")
    queryClient.clear()
    navigate({ to: "/login" })
  }

  return {
    signUpMutation,
    loginMutation,
    demoMutation,
    resetDemoMutation,
    exitDemoMutation,
    logout,
    user,
    isDemo: isDemoSession(),
  }
}

export { isDemoSession, isLoggedIn }
export default useAuth
