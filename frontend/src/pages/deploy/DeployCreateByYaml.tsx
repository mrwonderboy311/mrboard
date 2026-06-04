import YamlCreateForm from '@/components/shared/YamlCreateForm'

export default function DeployCreateByYaml() {
  return (
    <YamlCreateForm
      title="通过YAML创建Deployment"
      apiUrl="/mrboard/apply/v1/CreateByYaml"
      successRedirect="/deploy/list"
      placeholder="apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-deploy
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-container
        image: nginx:latest"
    />
  )
}
