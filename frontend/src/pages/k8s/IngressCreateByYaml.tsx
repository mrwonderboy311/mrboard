import YamlCreateForm from '@/components/shared/YamlCreateForm'

export default function IngressCreateByYaml() {
  return (
    <YamlCreateForm
      title="通过YAML创建Ingress"
      apiUrl="/mrboard/apply/v1/CreateByYaml"
      successRedirect="/k8s/ingress"
      placeholder="apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
  namespace: default
spec:
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: my-service
            port:
              number: 80"
    />
  )
}
