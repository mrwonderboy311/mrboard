import YamlCreateForm from '@/components/shared/YamlCreateForm'

export default function ServiceCreateByYaml() {
  return (
    <YamlCreateForm
      title="通过YAML创建Service"
      apiUrl="/mrboard/apply/v1/CreateByYaml"
      successRedirect="/k8s/service"
      placeholder="apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: default
spec:
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 8080"
    />
  )
}
